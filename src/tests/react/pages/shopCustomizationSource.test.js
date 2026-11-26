jest.mock('@controleonline/ui-common/src/react/utils/fileUrl',()=>({resolveFileImageUrl:()=>null}));
const {createShopCustomizationSource} = require('../../../react/pages/shopCustomizationSource');
const leaf = {id:3,'@id':'/products/3',product:'Sal',productGroups:[],customizationGroupsLoaded:true};
const child = {id:2,'@id':'/products/2',product:'Molho',productFiles:[],customizationGroupsLoaded:true,productGroups:[{
  id:20,required:true,minimum:1,products:[{id:200,productType:'component',product:leaf,price:2,quantity:1}],
}]};
const root = {id:1,'@id':'/products/1',product:'Pizza',price:12,customizationGroupsLoaded:true,productGroups:[{
  id:10,required:true,minimum:1,products:[{id:100,productType:'component',product:child,price:3,quantity:2}],
}]};
test('hydrates product, option images and multiple nested levels from one bounded projection',async()=>{
 const fetchCatalog=jest.fn().mockResolvedValue({member:[root]});
 const source=createShopCustomizationSource({companyId:'/people/4',productId:1,fetchCatalog});
 const [product,groups]=await Promise.all([source.productsActions.get(1),source.productGroupActions.getItems({product:1})]);
 expect(product.price).toBe(12);expect(groups[0].minimum).toBe(1);
 const options=await source.productGroupProductActions.getItems({productGroup:'/product_groups/10'});
 expect(options[0]).toEqual(expect.objectContaining({productChild:child,price:3,quantity:2}));
 expect(await source.productGroupActions.getItems({product:2})).toEqual(child.productGroups);
 expect((await source.productGroupProductActions.getItems({productGroup:20}))[0].productChild).toBe(leaf);
 expect(await source.productsActions.getItems({id:[2,3]})).toEqual([child,leaf]);
 expect(await source.productGroupProductActions.getItems({productGroup:10,productType:'feedstock'})).toEqual([]);
 expect(fetchCatalog).toHaveBeenCalledTimes(1);
 expect(fetchCatalog).toHaveBeenCalledWith('product-showcases/catalog',{params:{company:'4',integration_key:'shop',id:'1',itemsPerPage:1}});
 await expect(source.productsActions.get(99)).rejects.toThrow('indisponivel');
 await expect(source.productGroupProductActions.getItems({productGroup:99})).rejects.toThrow('indisponivel');
 expect(fetchCatalog).toHaveBeenCalledTimes(1);
});
test.each([null,{}, {member:[]},{member:[{...root,customizationGroupsLoaded:false}]}])('rejects missing or invalid projection without generic fallback: %p',async payload=>{
 const fetchCatalog=jest.fn().mockResolvedValue(payload);
 const source=createShopCustomizationSource({companyId:4,productId:1,fetchCatalog});
 await expect(source.load()).rejects.toThrow();
 expect(fetchCatalog).toHaveBeenCalledTimes(1);
});
test('retries a failed projection request without returning stale data',async()=>{
 const fetchCatalog=jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({member:[root]});
 const source=createShopCustomizationSource({companyId:4,productId:1,fetchCatalog});
 await expect(source.load()).rejects.toThrow('offline');
 expect(await source.load()).toBe(root);expect(fetchCatalog).toHaveBeenCalledTimes(2);
});
