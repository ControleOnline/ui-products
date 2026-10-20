import React from 'react';
import {ScrollView,Text,TouchableOpacity,View} from 'react-native';
import {categoryForest} from '../../utils/categoryHierarchy';

export default function HierarchicalCategoryTabs({categories=[],onSelectCategory,palette={},selectedCategoryId='',counts={},showCounts=true,compact=false,allCategory=null}) {
 const roots=categoryForest(categories);
 const id=c=>String(c.id||c['@id']?.split('/').pop()||'');
 const findPath=(nodes,path=[])=>{
  for(let index=0;index<nodes.length;index++){
   const node=nodes[index],next=[...path,{...node,number:index+1}];
   if(id(node.category)===String(selectedCategoryId))return next;
   const child=findPath(node.children,next);if(child.length)return child;
  }return [];
 };
 const path=findPath(roots),selected=String(selectedCategoryId);
 const button=(category,number,active,label)=>{
  const count=counts[id(category)],known=Number.isFinite(count);
  return <TouchableOpacity key={`${id(category)}:${label||''}`} accessibilityRole="tab"
   accessibilityLabel={showCounts ? `${label||category.name}, ${known?`${count} produtos`:'contagem carregando'}` : label||category.name}
   accessibilityState={{selected:active}} onPress={()=>onSelectCategory?.(category)}
   style={{minHeight:compact?44:56,paddingHorizontal:12,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:active?palette.buttonBackground:palette.cardBorder||palette.border,
    backgroundColor:active?palette.buttonBackground:palette.cardBackground||palette.background,flexDirection:'row',gap:8,alignItems:'center'}}>
   {!!number&&<Text style={{fontSize:11,color:active?palette.buttonText:palette.textSecondary}}>{number}</Text>}
   <Text numberOfLines={1} style={{fontSize:13,fontWeight:'600',color:active?palette.buttonText:palette.cardText||palette.text}}>{label||category.name}</Text>
   {showCounts&&<Text style={{fontSize:11,color:active?palette.buttonText:palette.textSecondary}}>{known?count:'…'}</Text>}
  </TouchableOpacity>;
 };
 const row=(key,label,children)=><View key={key} style={{gap:6}}>
  <Text style={{fontSize:11,color:palette.textSecondary}}>{label}</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{gap:8,paddingBottom:6}} testID={key}>{children}</ScrollView>
 </View>;
 return <View style={{gap:8,paddingHorizontal:12,paddingVertical:10}}>
  {row('pdv-main-categories','Categorias',<>{allCategory&&button(allCategory,'',selected===id(allCategory),'Todos os produtos')}{roots.map((node,index)=>button(node.category,String(index+1),path[0]&&id(path[0].category)===id(node.category)))}</>)}
  {path.filter(node=>node.children.length).map((node,level)=>row(`pdv-subcategories-${id(node.category)}`,`Dentro de ${node.category.name}`,<>
   {button(node.category,'',selected===id(node.category),'Todos')}
   {node.children.map((child,index)=>button(child.category,`${path.slice(0,level+1).map(p=>p.number).join('.')}.${index+1}`,path[level+1]&&id(path[level+1].category)===id(child.category)))}
  </>))}
 </View>;
}
