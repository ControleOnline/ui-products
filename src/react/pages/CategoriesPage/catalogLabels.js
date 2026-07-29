const translate = (type, key) => global.t?.t?.('categories', type, key)

export const buildCatalogLabels = context => {
  if (context === 'supplies') {
    return {
      allLabel: translate('label', 'allSupplies') || 'Todos os insumos',
      addCategoryLabel: translate('button', 'addSupplyCategory') || 'Adicionar Categoria de Insumo',
      countPlural: translate('label', 'supplyCategories') || 'categorias de insumo',
      countSingular: translate('label', 'supplyCategory') || 'categoria de insumo',
      editCategoryLabel: translate('title', 'editSupplyCategory') || 'Editar Categoria de Insumo',
      newCategoryLabel: translate('title', 'newSupplyCategory') || 'Nova Categoria de Insumo',
    }
  }

  return {
    allLabel: translate('label', 'all') || 'Todos',
    addCategoryLabel: translate('button', 'addCategory') || 'Adicionar Categoria',
    countPlural: translate('label', 'categories') || 'categorias',
    countSingular: translate('label', 'category') || 'categoria',
    editCategoryLabel: translate('title', 'editCategory') || 'Editar Categoria',
    newCategoryLabel: translate('title', 'newCategory') || 'Nova Categoria',
  }
}
