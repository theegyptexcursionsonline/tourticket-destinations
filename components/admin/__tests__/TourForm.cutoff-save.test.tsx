/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
const mockRefresh=jest.fn();const mockTenant={tenants:[{tenantId:'brand-a',name:'Brand'}],selectedTenantId:'brand-a',isAllTenantsSelected:()=>false};
jest.mock('next/navigation',()=>({useRouter:()=>({refresh:mockRefresh,push:jest.fn()})}));
jest.mock('@/hooks/useSettings',()=>({useSettings:()=>({selectedCurrency:{code:'USD'}})}));
jest.mock('@/contexts/AdminTenantContext',()=>({useAdminTenant:()=>mockTenant}));
jest.mock('next/image',()=>({__esModule:true,default:()=>null}));
jest.mock('framer-motion',()=>{const React=require('react');return {AnimatePresence:({children}:any)=>children,motion:{div:React.forwardRef(({children,initial,animate,exit,transition,...props}:any,ref:any)=><div ref={ref} {...props}>{children}</div>),button:React.forwardRef(({children,whileHover,whileTap,...props}:any,ref:any)=><button ref={ref} {...props}>{children}</button>)}};});
jest.mock('@/components/admin/TranslationEditor',()=>()=>null);
jest.mock('@/components/admin/TourStructuredTranslationEditor',()=>()=>null);
jest.mock('@/components/admin/SearchableCheckboxList',()=>()=>null);
jest.mock('@/components/admin/ImageSeoFields',()=>()=>null);
jest.mock('@/components/admin/ContentNavigationFields',()=>()=>null);
jest.mock('react-hot-toast',()=>({__esModule:true,default:{success:jest.fn(),error:jest.fn()}}));
import TourForm from '@/components/TourForm';
const tour:any={_id:'tour-one',tenantId:'brand-a',tenantIds:['brand-a'],title:'Tour',description:'Description',duration:'2 hours',discountPrice:20,destination:'destination-one',category:['category-one'],bookingCutoffMinutes:0,availability:{type:'daily',slots:[{time:'10:00',capacity:10}]}};
beforeEach(()=>{jest.clearAllMocks();global.fetch=jest.fn(async(_url:any,options:any)=>({ok:true,json:async()=> options?.method==='PUT'?{success:true}: {success:true,data:[],destinations:[],categories:[],attractions:[],interests:[]}})) as any;});
async function settings(){fireEvent.click(screen.getByRole('button',{name:'Pricing & Details'}));await screen.findByLabelText('Cutoff hours');}
it('keeps full-page editor open and saves repeated 0 to 120 to 0 as field-only changes',async()=>{
 render(<TourForm tourToEdit={tour} fullPage/>);await settings();
 for(const hours of ['2','0']){
  fireEvent.change(screen.getByLabelText('Cutoff hours'),{target:{value:hours}});
  fireEvent.click(screen.getByRole('button',{name:'Update Tour'}));
  await waitFor(()=>expect(mockRefresh).toHaveBeenCalledTimes(hours==='2'?1:2));
  expect(screen.getByLabelText('Cutoff hours')).toBeTruthy();
 }
 const writes=(global.fetch as jest.Mock).mock.calls.filter(([,options])=>options?.method==='PUT');
 expect(writes.map(([,options])=>JSON.parse(options.body))).toEqual([{bookingCutoffMinutes:120},{bookingCutoffMinutes:0}]);
});
it('retains modal dismissal after cutoff save',async()=>{
 render(<TourForm tourToEdit={tour}/>);fireEvent.click(screen.getByRole('button',{name:/Edit Tour/i}));await settings();
 fireEvent.change(screen.getByLabelText('Cutoff hours'),{target:{value:'2'}});fireEvent.click(screen.getByRole('button',{name:'Update Tour'}));
 await waitFor(()=>expect(mockRefresh).toHaveBeenCalled());expect(screen.queryByLabelText('Cutoff hours')).toBeNull();
});
it('allows isolated cutoff save for legacy incomplete content',async()=>{
 render(<TourForm tourToEdit={{...tour,description:''}} fullPage/>);await settings();
 fireEvent.change(screen.getByLabelText('Cutoff hours'),{target:{value:'2'}});const button=screen.getByRole('button',{name:'Update Tour'}) as HTMLButtonElement;expect(button.disabled).toBe(false);fireEvent.click(button);await waitFor(()=>expect(mockRefresh).toHaveBeenCalled());
});
it('keeps full-page editor open after a normal content save too',async()=>{
 render(<TourForm tourToEdit={tour} fullPage/>);
 fireEvent.change(screen.getByDisplayValue('Tour'),{target:{value:'Updated Tour'}});
 fireEvent.click(screen.getByRole('button',{name:'Update Tour'}));
 await waitFor(()=>expect(mockRefresh).toHaveBeenCalled());
 expect(screen.getByDisplayValue('Updated Tour')).toBeTruthy();
 const write=(global.fetch as jest.Mock).mock.calls.find(([,options])=>options?.method==='PUT');
 expect(JSON.parse(write[1].body)).toMatchObject({title:'Updated Tour'});
 expect(JSON.parse(write[1].body)).not.toHaveProperty('bookingCutoffMinutes');
});
