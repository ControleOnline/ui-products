
import Products from '@controleonline/ui-products/src/react/pages/Products';
import Categories from '@controleonline/ui-products/src/react/pages/Categories';
import CustomizeScreen from '@controleonline/ui-products/src/react/pages/CustomizeScreen';
import ProductDetails from '@controleonline/ui-products/src/react/pages/ProductDetails';

const ordersRoutes = [
  {
    name: 'ProductsPage',
    component: Products,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Escolher Produtos',
    },
    initialParams: { store: 'products' },
  },
  {
    name: 'ProductDetails',
    component: ProductDetails,
    options: ({ route }) => ({
      headerShown: true,
      headerBackVisible: true,
      title: route.params?.ProductId ? 'Editar Produto' : 'Adicionar Produto',
    }),
    initialParams: { store: 'products' },
  },
  {
    name: 'CategoriesPage',
    component: Categories,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Categorias',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'category' },
  },
  {
    name: 'CustomizeScreen',
    component: CustomizeScreen,
    options: {
      headerShown: true,
      headerBackVisible: false,
      title: 'Customizar',
    },
    initialParams: { store: 'products' },
  },
];

export default ordersRoutes;
