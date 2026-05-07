import { env } from '@env';
import Products from '@controleonline/ui-products/src/react/pages/Products';
import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import CustomizeScreen from '@controleonline/ui-products/src/react/pages/CustomizeScreen';
import ProductDetails from '@controleonline/ui-products/src/react/pages/ProductDetails';
import Inventories from '@controleonline/ui-products/src/react/pages/Inventories';
import InventoryDetail from '@controleonline/ui-products/src/react/pages/InventoryDetail';
import InventoryMovements from '@controleonline/ui-products/src/react/pages/InventoryMovements';
import PurchaseSuggestions from '@controleonline/ui-products/src/react/pages/PurchaseSuggestions';
import PurchaseForm from '@controleonline/ui-products/src/react/pages/PurchaseForm';

const isPosApp = String(env.APP_TYPE || '').toUpperCase() === 'POS';
const normalizeNumericParam = value => String(value || '').replace(/\D+/g, '') || undefined;
const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products';
const getCatalogEntityLabel = context =>
  normalizeCatalogContext(context) === 'supplies' ? 'Insumos' : 'Produtos';
const getCatalogCategoryLabel = context =>
  normalizeCatalogContext(context) === 'supplies'
    ? 'Categorias de Insumo'
    : 'Categorias';
const getProductDetailsTitle = route => {
  const context = normalizeCatalogContext(route.params?.context);
  const entityLabel = context === 'supplies' ? 'Insumo' : 'Produto';
  return route.params?.ProductId ? `Editar ${entityLabel}` : `Adicionar ${entityLabel}`;
};

const ordersRoutes = [
  {
    name: 'ProductsPage',
    component: Products,
    path: 'products-page/:categoryId?',
    options: ({ route }) => ({
      headerShown: true,
      headerBackVisible: true,
      title: getCatalogEntityLabel(route.params?.context),
      showBottomCart: isPosApp,
    }),
    initialParams: { store: 'products' },
  },
  {
    name: 'ProductDetails',
    component: ProductDetails,
    path: {
      path: 'product-details/:ProductId?',
      parse: {
        ProductId: normalizeNumericParam,
      },
      screens: {
        Dados: '',
        Fornecedores: 'fornecedores',
        Grupos: 'grupos',
        Estoque: 'estoque',
      },
    },
    options: ({ route }) => ({
      headerShown: true,
      headerBackVisible: true,
      title: getProductDetailsTitle(route),
    }),
    initialParams: { store: 'products' },
  },
  {
    name: 'ProductDetailsModal',
    component: ProductDetails,
    options: ({ route }) => ({
      headerShown: true,
      headerBackVisible: true,
      presentation: 'modal',
      title: getProductDetailsTitle(route),
    }),
    initialParams: { store: 'products' },
  },
  {
    name: 'CategoriesPage',
    component: Categories,
    path: {
      path: 'categories-page/:categoryId?',
      parse: {
        categoryId: normalizeNumericParam,
      },
    },
    options: ({ route }) => ({
      headerShown: true,
      headerBackVisible: true,
      title: getCatalogCategoryLabel(route.params?.context),
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    }),
    initialParams: { store: 'category' },
  },
  {
    name: 'CustomizeScreen',
    component: CustomizeScreen,
    options: {
      headerShown: false,
      showBottomCart: false,
      presentation: 'transparentModal',
      animation: 'fade',
      contentStyle: {backgroundColor: 'transparent'},
    },
    initialParams: { store: 'products' },
  },
  {
    name: 'InventoriesPage',
    component: Inventories,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Locais de Estoque',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'inventories' },
  },
  {
    name: 'InventoryDetail',
    component: InventoryDetail,
    options: ({ route }) => ({
      headerShown: true,
      headerBackVisible: true,
      title: route.params?.inventory?._isNoInventory
        ? 'Sem Local de Estoque'
        : (route.params?.inventory?.inventory || 'Estoque'),
    }),
    initialParams: { store: 'inventories' },
  },
  {
    name: 'InventoryMovements',
    component: InventoryMovements,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Histórico de Movimentações',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'inventories' },
  },
  {
    name: 'PurchaseSuggestionsPage',
    component: PurchaseSuggestions,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Sugestões de Compra',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'product_inventories' },
  },
  {
    name: 'PurchaseFormPage',
    component: PurchaseForm,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Registrar Compra',
    },
    initialParams: { store: 'orders' },
  },
];

export default ordersRoutes;
