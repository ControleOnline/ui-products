import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export function printPurchasingSuggestion({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/products/purchasing-suggestion/print', options)

    .then(data => {
      commit(types.SET_ISLOADING, false);

      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}


export function printInventory({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/products/inventory/print', options)
    .then(data => {
      commit(types.SET_ISLOADING, false);
      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}


export function getInventory({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  return api
    .fetch('/products/inventory', {params: params})
    .then(data => {
      commit(types.SET_ISLOADING, false);
      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}

export function getPurchasingSuggestion({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  return api
    .fetch('/products/purchasing-suggestion', {params: params})
    .then(data => {
      commit(types.SET_ISLOADING, false);

      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}
