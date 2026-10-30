const categoryId=value=>{
 if(value&&typeof value==='object')return categoryId(value.id??value['@id']);
 return value===undefined||value===null?'':String(value).replace(/\/$/,'').split('/').pop();
};

// Only rearrange the categories returned by the active query. Missing parents
// stay visible as roots; never invent records or pull unfiltered store rows in.
export function categoryForest(categories) {
 const nodes=(categories||[]).map(category=>({category,children:[]}));
 const byId=new Map(nodes.map(node=>[categoryId(node.category),node]));
 const roots=[];
 const parentFor=node=>{const id=categoryId(node.category.parent);return id?byId.get(id):undefined;};
 for(const node of nodes){
  const ancestors=new Set([node]);let parent=parentFor(node),cursor=parent,cyclic=false;
  while(cursor){if(ancestors.has(cursor)){cyclic=true;break;}ancestors.add(cursor);cursor=parentFor(cursor);}
  if(parent&&!cyclic)parent.children.push(node);else roots.push(node);
 }
 return roots;
}

export function groupCategoryCards(categories) {
 return categoryForest(categories).map(node=>({...node.category,__pdvCategoryNode:node}));
}
