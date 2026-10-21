import React from 'react';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';

export default function NativePdvCategoryEntry({items, actions, renderCard, onSelect, toolbarActions = [], requestParams}) {
  const entryActions=toolbarActions.filter(action=>action.key!=='catalog-categories');
  return <DefaultTable nativeCatalogEntry storeName="categories" data={items || []} actions={actions}
    requestParams={requestParams} renderCard={renderCard} onRowPress={onSelect} initialViewMode="cards" viewMode="cards"
    add={false} showSearch={false} showToolbar={entryActions.length>0} showToolbarActions showToolbarControls={false}
    showAdministrativeTools={false} showRowActions={false} showTotalItemsInFooter={false}
    showTotalItemsInCompactToolbar={false} toolbarActions={entryActions}/>;
}
