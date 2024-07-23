<template>
  <q-page>
    <!-- Inicio das Abas -->
    <div class="q-pt-lg">
      <q-card>
        <q-card-section v-if="ProductId">
          <div
            class="q-card q-pa-sm"
            style="max-width: calc(var(--zoom-width) - 30px)"
          >
            <Product :ProductId="ProductId" />
            <q-tabs
              inline-label
              no-caps
              outside-arrows
              mobile-arrows
              align="left"
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              v-model="tab"
            >
              <q-tab name="group" icon="tab" :label="$t('Group')" />
              <q-tab name="categories" icon="tab" :label="$t('Categories')" />
              <q-tab name="price" icon="tab" :label="$t('Price')" />
              <q-tab name="provider" icon="tab" :label="$t('Provider')" />
              <q-tab name="stock" icon="tab" :label="$t('Stock')" />
              <q-tab
                name="advertisement"
                icon="tab"
                :label="$t('Advertisement')"
              />
              <q-tab name="taxing" icon="tab" :label="$t('Taxing')" />
            </q-tabs>
            <q-tab-panels
              v-model="tab"
              animated
              swipeable
              transition-prev="jump-up"
              transition-next="jump-up"
            >
              <q-tab-panel class="items-center" name="group">
                <Group :ProductId="ProductId" />
              </q-tab-panel>
              <q-tab-panel class="items-center" name="categories">
                <Categories :ProductId="ProductId" />
              </q-tab-panel>
              <q-tab-panel class="items-center" name="price">
                <Price :ProductId="ProductId" />
              </q-tab-panel>
              <q-tab-panel class="items-center" name="provider">
                <Provider :ProductId="ProductId" />
              </q-tab-panel>
              <q-tab-panel class="items-center" name="stock">
                <Stock :ProductId="ProductId" />
              </q-tab-panel>
              <q-tab-panel class="items-center" name="advertisement">
                <Advertisement :ProductId="ProductId" />
              </q-tab-panel>
              <q-tab-panel class="items-center" name="taxing">
                <Taxing :ProductId="ProductId" />
              </q-tab-panel>
            </q-tab-panels>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import Product from "./components/details.vue";
import Advertisement from "./components/tabs/advertisement.vue";
import Categories from "./components/tabs/categories.vue";
import Group from "./components/tabs/group.vue";
import Price from "./components/tabs/price.vue";
import Provider from "./components/tabs/provider.vue";
import Stock from "./components/tabs/stock.vue";
import Taxing from "./components/tabs/taxing.vue";

export default {
  components: {
    Product,
    Group,
    Categories,
    Price,
    Provider,
    Stock,
    Advertisement,
    Taxing,
  },

  data() {
    return {
      ProductId: null,
      tab: "group",
    };
  },
  created() {
    let ProductId = decodeURIComponent(this.$route.params.id);
    this.ProductId = ProductId == "undefined" ? null : ProductId;
  },

  computed: {},

  methods: {},

  watch: {},
};
</script>
