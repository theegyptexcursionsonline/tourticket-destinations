/** @jest-environment node */
import { parseDiscountInput, discountMutationError } from '../adminInput';
const valid = { code: ' summer20 ', discountType: 'percentage', value: 20 };
it('normalizes a code while keeping server-owned fields out of the write', () => {
  expect(parseDiscountInput({ ...valid, tenantId: 'brand-a' })).toEqual({ code: 'SUMMER20', discountType: 'percentage', value: 20 });
});
it.each([null, [], '', {...valid,timesUsed:0}, {...valid,$set:{value:100}}, {...valid,code:'A B'}, {...valid,code:'x'.repeat(65)}, {...valid,value:101}, {...valid,value:0}, {...valid,value:-1}, {...valid,value:'20'}, {...valid,value:NaN}, {...valid,usageLimit:1.5}, {...valid,expiresAt:'bad'}, {...valid,isActive:'true'}])('rejects malformed or unauthorized discount fields (%#)', (body) => {
  expect(() => parseDiscountInput(body)).toThrow();
});
it('accepts an explicit status-only patch and removal of optional limits', () => {
  expect(parseDiscountInput({ isActive:false, expiresAt:null, usageLimit:null },true)).toEqual({ isActive:false, expiresAt:null, usageLimit:null });
  expect(() => parseDiscountInput({},true)).toThrow();
});
it('returns a useful conflict for a duplicate race and hides database internals', async () => {
  const duplicate=discountMutationError({code:11000,message:'private database detail'});
  expect(duplicate.status).toBe(409);
  expect(await duplicate.json()).toEqual({success:false,error:'This discount code already exists. Choose a different code.'});
  const failed=discountMutationError(new Error('private database detail'));
  expect(failed.status).toBe(503);
  expect(JSON.stringify(await failed.json())).not.toContain('private');
});
