import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export const PRODUCT_SHOWCASE_INTEGRATIONS = [
  {value: 'pos', label: 'POS'},
  {value: 'shop', label: 'Shop'},
  {value: 'ifood', label: 'iFood'},
  {value: '99food', label: '99'},
  {value: 'mercado_livre', label: 'Mercado Livre'},
  {value: 'shopee', label: 'Shopee'},
  {value: 'amazon', label: 'Amazon'},
];

export default {
  namespaced: true,
  state: {
    offline: false,
    item: {},
    items: [],
    resourceEndpoint: 'product_showcases',
    isLoading: false,
    error: '',
    totalItems: 0,
    summary: {},
    messages: [],
    message: {},
    filters: {},
    columns: [
      {
        sortable: true,
        name: 'id',
        align: 'left',
        label: 'id',
        isIdentity: true,
        format(value) {
          return value ? `#${value}` : '';
        },
      },
      {
        sortable: true,
        editable: true,
        name: 'name',
        align: 'left',
        label: 'name',
        defaultSort: 'ASC',
        externalFilter: true,
        searchParam: 'search',
        format(value) {
          return value || '';
        },
        saveFormat(value) {
          return value || '';
        },
      },
      {
        sortable: true,
        editable: true,
        name: 'integrationKey',
        align: 'left',
        label: 'integration',
        externalFilter: true,
        list: PRODUCT_SHOWCASE_INTEGRATIONS,
        format(value) {
          return value || '';
        },
        saveFormat(value) {
          return value || '';
        },
      },
      {
        sortable: true,
        editable: true,
        name: 'peopleDomain',
        sortField: 'peopleDomain.domain',
        align: 'left',
        label: 'Domínio do shop',
        list: 'people_domains/getItems',
        listRequestParams({currentCompanyId}) {
          return {
            ...(currentCompanyId ? {people: `/people/${currentCompanyId}`} : {}),
            domainType: 'SHOP',
          };
        },
        format(value) {
          return value?.domain || '';
        },
        saveFormat(value) {
          return value ? `/people_domains/${value.value || value}` : null;
        },
      },
      {
        sortable: true,
        editable: true,
        name: 'active',
        align: 'left',
        label: 'active',
        externalFilter: true,
        list: [
          {value: true, label: 'active'},
          {value: false, label: 'inactive'},
        ],
        format(value) {
          return value ? 'active' : 'inactive';
        },
        saveFormat(value) {
          return value === true || value === 'true';
        },
      },
      {
        sortable: true,
        editable: true,
        name: 'company',
        align: 'left',
        label: 'company',
        list: 'people/getItems',
        visible: false,
        format(value) {
          return value?.name || '';
        },
        saveFormat(value) {
          return value ? `/people/${value.value || value}` : null;
        },
      },
    ],
  },
  actions,
  getters,
  mutations,
};
