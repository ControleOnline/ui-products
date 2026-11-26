import React, {useMemo} from 'react';
import {FlatList, View, useWindowDimensions} from 'react-native';
import DefaultFile from '@controleonline/ui-default/src/react/components/files/DefaultFile';
import {categoryForest} from '../../utils/categoryHierarchy';

const id = value => String(value?.id || value?.['@id'] || value || '').split('/').pop();

// Browse only the authorized catalog rows already supplied by the existing store.
export default function PdvCategoryLevelCards({items, browseId, palette, ...props}) {
  const {width} = useWindowDimensions();
  const columns = width <= 760 ? 2 : width < 1280 ? 3 : 5;
  const roots = useMemo(() => categoryForest(items || []), [items]);
  const find = (nodes, trail = []) => {
    for (const node of nodes) {
      const next = [...trail, node];
      if (id(node.category) === browseId) return next;
      const result = find(node.children, next);
      if (result.length) return result;
    }
    return [];
  };
  const trail = browseId ? find(roots) : [];
  const current = trail[trail.length - 1];
  const visible = useMemo(() => (current ? current.children : roots).map(node => node.category), [current, roots]);
  const presentation = {
    FileComponent: DefaultFile, showManagement:false, background:palette.cardBackground,
    styles:{
      cardTouchable:{flex:1},
      cardImage:{width:'100%',minHeight:88,borderRadius:12,borderWidth:1,borderColor:palette.cardBorder,flexDirection:'row',alignItems:'center',gap:10,padding:10},
      cardImageCompact:{},cardImageMobile:{},
      cardCoverImage:{width:52,height:52,borderRadius:8,flexShrink:0},
      cardOverlay:{flex:1,minWidth:0,backgroundColor:palette.cardBackground,justifyContent:'center'},
      cardOverlayCompact:{},cardOverlayMobile:{},
      cardOverlayName:{fontSize:14,fontWeight:'700',color:palette.textPrimary || palette.text},
      cardOverlayNameCompact:{},cardOverlayNameMobile:{},
    },
  };
  return <View style={{flex:1, minHeight:0}}>
    <FlatList key={columns} numColumns={columns} data={visible}
      keyExtractor={item => id(item)} contentContainerStyle={{padding:12,gap:12}}
      columnWrapperStyle={{gap:12,alignItems:'flex-start'}}
      renderItem={({item}) => <View style={{flex:1,maxWidth:`${100/columns}%`,minWidth:0}}>
        {React.cloneElement(props.renderCard({item}), {presentation})}
      </View>}/>

  </View>;
}
