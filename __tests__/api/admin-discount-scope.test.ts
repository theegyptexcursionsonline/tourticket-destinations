/** @jest-environment node */
jest.mock('@/lib/dbConnect', () => ({__esModule:true,default:jest.fn()}));
jest.mock('@/lib/admin/adminAudit', () => ({withAdminAudit:(handler:unknown)=>handler}));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth:jest.fn(),
  canAccessTenant:jest.fn((_auth,tenant)=>tenant==='brand-a'),
  tenantForbiddenResponse:()=>require('next/server').NextResponse.json({error:'Forbidden'},{status:403}),
}));
jest.mock('@/lib/models/Discount', () => ({__esModule:true,default:{
  find:jest.fn(),findOne:jest.fn(),findById:jest.fn(),create:jest.fn(),exists:jest.fn(),
  findOneAndUpdate:jest.fn(),findOneAndDelete:jest.fn(),
}}));
import {NextRequest,NextResponse} from 'next/server';
import Discount from '@/lib/models/Discount';
import {requireAdminAuth} from '@/lib/auth/adminAuth';
import {POST,GET} from '@/app/api/admin/discounts/route';
import {PUT,DELETE} from '@/app/api/admin/discounts/[id]/route';
const db=Discount as unknown as Record<string,jest.Mock>;
const id='507f1f77bcf86cd799439011';
const ctx={params:Promise.resolve({id})};
const request=(body:unknown,tenant?:string)=>new NextRequest('https://example.test/api/admin/discounts'+(tenant?'?tenantId='+tenant:''),{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}});
beforeEach(()=>{
  jest.clearAllMocks();
  (requireAdminAuth as jest.Mock).mockResolvedValue({role:'admin',tenantIds:['brand-a']});
  db.exists.mockResolvedValue(null);
  db.create.mockImplementation(async data=>({_id:id,...data}));
  db.find.mockReturnValue({sort:jest.fn().mockResolvedValue([])});
  db.findOneAndUpdate.mockResolvedValue({_id:id,isActive:false});
  db.findOneAndDelete.mockResolvedValue({_id:id});
});
it('denies missing permission before accessing data',async()=>{
  (requireAdminAuth as jest.Mock).mockResolvedValue(NextResponse.json({error:'Forbidden'},{status:403}));
  expect((await POST(request({}))).status).toBe(403);
  expect(db.create).not.toHaveBeenCalled();
});
it('turns a concurrent duplicate conflict into 409 without exposing the database error',async()=>{
  db.create.mockRejectedValue({code:11000,message:'private database detail'});
  const response=await POST(request(VALID));
  expect(response.status).toBe(409);
  expect(JSON.stringify(await response.json())).not.toContain('private database');
});
it('rejects client-supplied usage counters and Mongo operators',async()=>{
  expect((await POST(request({...VALID,timesUsed:5}))).status).toBe(400);
  expect((await POST(request({...VALID,$set:{value:90}}))).status).toBe(400);
  expect(db.create).not.toHaveBeenCalled();
});

const VALID={code:' welcome20 ',discountType:'percentage',value:20,tenantId:'brand-a'};
it('creates the normalized code only within the selected authorized brand',async()=>{
  expect((await POST(request(VALID))).status).toBe(201);
  expect(db.create).toHaveBeenCalledWith({code:'WELCOME20',discountType:'percentage',value:20,tenantId:'brand-a'});
});
it('rejects All Brands and an unauthorized brand without creating data',async()=>{
  expect((await POST(request({...VALID,tenantId:'all'}))).status).toBe(400);
  expect((await POST(request({...VALID,tenantId:'brand-other'}))).status).toBe(403);
  expect(db.create).not.toHaveBeenCalled();
});
it('does not permit moving a discount to another brand or acting on a stale selection',async()=>{
  db.findById.mockReturnValue({select:jest.fn().mockReturnValue({lean:jest.fn().mockResolvedValue({tenantId:'brand-a',discountType:'percentage',value:20})})});
  expect((await PUT(request({isActive:false,tenantId:'brand-other'}),ctx)).status).toBe(403);
  expect((await PUT(request({isActive:false},'brand-other'),ctx)).status).toBe(403);
  expect((await DELETE(new NextRequest('https://example.test/api/admin/discounts/'+id+'?tenantId=brand-other',{method:'DELETE'}),ctx)).status).toBe(403);
  expect(db.findOneAndUpdate).not.toHaveBeenCalled();
  expect(db.findOneAndDelete).not.toHaveBeenCalled();
});
it('binds writes to the original record tenant and enforces the merged percentage limit',async()=>{
  db.findById.mockReturnValue({select:jest.fn().mockReturnValue({lean:jest.fn().mockResolvedValue({tenantId:'brand-a',discountType:'percentage',value:20})})});
  expect((await PUT(request({value:101},'brand-a'),ctx)).status).toBe(400);
  expect((await PUT(request({isActive:false},'brand-a'),ctx)).status).toBe(200);
  expect(db.findOneAndUpdate).toHaveBeenCalledWith({_id:id,tenantId:'brand-a',discountType:'percentage',value:20},{$set:{isActive:false}},expect.objectContaining({runValidators:true}));
});

it('serializes concurrent type/value edits against the same validated prior state',async()=>{
  const state:Record<string,unknown>={_id:id,tenantId:'brand-a',discountType:'fixed',value:50};
  let reads=0; let release!:()=>void;
  const barrier=new Promise<void>(resolve=>{release=resolve;});
  db.findById.mockImplementation(()=>({select:()=>({lean:async()=>{
    const snapshot={...state}; reads++; if(reads===2)release(); await barrier; return snapshot;
  }})}));
  db.findOneAndUpdate.mockImplementation(async(filter,update)=>{
    if(!Object.entries(filter).every(([key,value])=>state[key]===value))return null;
    Object.assign(state,update.$set); return {...state};
  });
  const responses=await Promise.all([PUT(request({discountType:'percentage'},'brand-a'),ctx),PUT(request({value:150},'brand-a'),ctx)]);
  expect(responses.map(response=>response.status).sort()).toEqual([200,409]);
  expect(state.discountType==='percentage' && Number(state.value)>100).toBe(false);
  expect(db.findOneAndUpdate).toHaveBeenCalledTimes(2);
  for(const [filter] of db.findOneAndUpdate.mock.calls)expect(filter).toMatchObject({tenantId:'brand-a',discountType:'fixed',value:50});
});
