import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';
import {PRODUCT_SHOWCASE_INTEGRATIONS} from '../product_showcases';

const normalizeId = value =>
  String(value?.id || value?.['@id'] || value || '').replace(/\D+/g, '');

const formatProduct = product =>
  product?.product || product?.description || (normalizeId(product) ? `#${normalizeId(product)}` : '');

const formatShowcase = showcase =>
  showcase?.name || (normalizeId(showcase) ? `#${normalizeId(showcase)}` : '');

const formatInventory = row => {
  /*
   * @agents Product showcase items may override the product default inventory.
   * The distribution table must show the item inventory first because that is
   * the stock source used by POS, Shop and marketplace sale flows.
   */
  const inventory = row?.outInventory || row?.product?.defaultOutInventory;

  return inventory?.inventory || inventory?.name || '';
};

export default {
  namespaced: true,
  state: {
    offline: false,
    item: {},
    items: [],
    resourceEndpoint: 'product_showcase_items',
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
        visible: false,
        format(value) {
          return value ? `#${value}` : '';
        },
      },
      {
        sortable: true,
        name: 'product',
        sortField: 'product.product',
        align: 'left',
        label: 'product',
        searchParam: 'search',
        list: 'products/getItems',
        listRequestParams({currentCompanyId}) {
          return currentCompanyId ? {company: currentCompanyId} : {};
        },
        format(value) {
          return formatProduct(value);
        },
        saveFormat(value) {
          return value ? `/products/${value.value || value}` : null;
        },
      },
      {
        sortable: true,
        editable: true,
        inputType: 'number',
        name: 'sortOrder',
        label: 'sortOrder',
        defaultSort: 'ASC',
        format(value) {
          return value ?? '';
        },
        saveFormat(value) {
          return value === '' || value === null || value === undefined
            ? null
            : Number(value);
        },
      },
      {
        sortable: true,
        name: 'showcase',
        sortField: 'showcase.name',
        align: 'left',
        label: 'showcase',
        list: 'product_showcases/getItems',
        listRequestParams({requestParams}) {
          return requestParams?.['showcase.company']
            ? {company: requestParams['showcase.company']}
            : {};
        },
        format(value) {
          return formatShowcase(value);
        },
        saveFormat(value) {
          return value ? `/product_showcases/${value.value || value}` : null;
        },
      },
      {
        sortable: true,
        name: 'showcase.integrationKey',
        sortField: 'showcase.integrationKey',
        align: 'left',
        label: 'integration',
        externalFilter: true,
        list: PRODUCT_SHOWCASE_INTEGRATIONS,
        format(value, column, row) {
          return row?.showcase?.integrationKey || value || '';
        },
      },
      {
        sortable: true,
        name: 'outInventory',
        sortField: 'outInventory.inventory',
        align: 'left',
        label: 'outInventory',
        list: 'inventories/getItems',
        listRequestParams({currentCompanyId}) {
          return currentCompanyId ? {people: currentCompanyId} : {};
        },
        format(value, column, row) {
          return formatInventory({...row, outInventory: value});
        },
        saveFormat(value) {
          return value ? `/inventories/${value.value || value}` : null;
        },
      },
      {
        sortable: true,
        editable: true,
        name: 'externalCode',
        align: 'left',
        label: 'externalCode',
        format(value) {
          return value || '';
        },
        saveFormat(value) {
          return value || null;
        },
      },
      {
        sortable: false,
        editable: false,
        name: 'settings',
        align: 'left',
        label: 'marketplaceData',
        inputType: 'extra-data',
        format(value) {
          return value || null;
        },
      },
      {
        sortable: true,
        editable: true,
        name: 'price',
        align: 'right',
        label: 'price',
        sum: true,
        editFormat(value) {
          return Formatter.formatMoney(value);
        },
        saveFormat(value) {
          return Formatter.formatFloat(value);
        },
        format(value) {
          return Formatter.formatMoney(value || 0);
        },
      },
      {
        sortable: true,
        editable: true,
        name: 'active',
        align: 'left',
        label: 'active',
        list: [
          {value: true, label: 'active'},
          {value: false, label: 'inactive'},
        ],
        format(value) {
          return value !== false ? 'active' : 'inactive';
        },
        saveFormat(value) {
          return value === true || value === 'true';
        },
      },
    ],
  },
  actions,
  getters,
  mutations,
};
