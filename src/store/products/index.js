import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';
import * as customActions from './customActions';

export default {
  namespaced: true,
  state: {
    offline: true,
    item: {},
    items: [],
    resourceEndpoint: 'products',
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
        sum: false,
        isIdentity: true,
        to: function (value) {
          return {
            name: 'ProductDetails',
            params: {id: value},
          };
        },
        format: function (value) {
          return '#' + value;
        },
      },
      {
        sortable: true,
        name: 'sku',
        externalFilter: false,
        align: 'left',
        label: 'sku',
        sum: false,
        format: function (value) {
          return value || '';
        },
        saveFormat: function (value) {
          return value || '';
        },
      },
      {
        sortable: true,
        name: 'product',
        externalFilter: false,
        align: 'left',
        label: 'product',
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        name: 'description',
        externalFilter: false,
        align: 'left',
        label: 'description',
        format: function (value) {
          return value || '';
        },
        saveFormat: function (value) {
          return value || '';
        },
      },
      {
        sortable: true,
        externalFilter: false,
        name: 'productUnit',
        align: 'left',
        list: 'product_unit/getItems',
        label: 'productUnit',
        format: function (value) {
          return value?.productUnit;
        },

        saveFormat: function (value) {
          return value ? '/product_unities/' + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        externalFilter: false,
        editable: true,
        name: 'queue',
        align: 'left',
        list: 'queues/getItems',
        label: 'queue',
        format: function (value) {
          return value?.queue;
        },

        saveFormat: function (value) {
          return value ? '/queues/' + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        externalFilter: false,
        name: 'type',
        align: 'left',
        list: [
          {value: 'custom', label: 'Produto Customizado'},
          {value: 'manufactured', label: 'Produto Manufaturado'},
          {value: 'product', label: 'Produto'},
          {value: 'service', label: 'Serviço'},
          {value: 'component', label: 'Componente'},
          {value: 'feedstock', label: 'Matéria Prima'},
          {value: 'package', label: 'Embalagem'},
        ],
        label: 'type',
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        name: 'productCondition',
        externalFilter: false,
        list: [
          {value: 'new', label: 'Novo'},
          {value: 'used', label: 'Usado'},
          {value: 'recondicioned', label: 'Recondicionado'},
        ],
        align: 'left',
        label: 'productCondition',
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
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
          return Formatter.formatMoney(value);
        },
      },
      {
        sortable: true,
        name: 'featured',
        align: 'left',
        label: 'featured',
        list: [
          {value: true, label: 'Sim'},
          {value: false, label: 'Não'},
        ],
        format: function (value) {
          return value ? 'Sim' : 'Não';
        },
        saveFormat: function (value) {
          return !!value;
        },
      },
      {
        sortable: true,
        name: 'active',
        align: 'left',
        label: 'active',
        list: [
          {value: true, label: 'Ativo'},
          {value: false, label: 'Inativo'},
        ],
        format: function (value) {
          return value ? 'Ativo' : 'Inativo';
        },
        saveFormat: function (value) {
          return !!value;
        },
      },
      {
        sortable: true,
        name: 'company',
        align: 'left',
        label: 'company',
        list: 'people/getItems',
        format: function (value) {
          return value?.name || '';
        },
        saveFormat: function (value) {
          return value ? '/people/' + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        name: 'defaultOutInventory',
        align: 'left',
        label: 'defaultOutInventory',
        list: 'inventories/getItems',
        format: function (value) {
          return value?.name || '';
        },
        saveFormat: function (value) {
          return value ? '/inventories/' + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        name: 'defaultInInventory',
        align: 'left',
        label: 'defaultInInventory',
        list: 'inventories/getItems',
        format: function (value) {
          return value?.name || '';
        },
        saveFormat: function (value) {
          return value ? '/inventories/' + (value.value || value) : null;
        },
      },
      {
        sortable: false,
        name: 'extraData',
        align: 'left',
        label: 'extraData',
        format: function (value) {
          return value ? JSON.stringify(value) : '';
        },
        saveFormat: function (value) {
          return value || null;
        },
      },
    ],
  },
  actions: {...actions, ...customActions},
  getters,
  mutations,
};
