<template>
  <div class="row">
    <q-list padding bordered class="rounded-borders full-width">
      <q-expansion-item
        v-for="(group, index) in product_groups"
        :key="index"
        dense
        v-model="expandedGroup[index]"
        group="somegroup"
        expand-separator
        icon="perm_identity"
        :label="group.productGroup"
        @click="key++"
      >
        <div
          class="col-12 q-mb-md q-pa-sm"
          style="display: flex; flex-direction: column"
        >
          <q-card style="flex: 1; padding-bottom: 80px">
            <q-card-section>
              <q-item>
                <q-item-section>
                  <div class="row">
                    <div class="col-8 q-pr-sm">
                      <q-input
                        dense
                        stack-label
                        v-model="group.productGroup"
                        class="min-max-input"
                        label="Grupo"
                        @change="updateGroup(group)"
                      />
                    </div>
                    <div class="col-4 q-pt-sm text-center">
                      <label class="required-label">Obrigatório</label>
                      <q-toggle
                        dense
                        stack-label
                        v-model="group.required"
                        color="primary"
                        class="min-max-input required-input"
                        @update:model-value="updateGroup(group)"
                      />
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-6 q-pr-sm">
                      <q-input
                        dense
                        stack-label
                        label="Mínimo"
                        v-model="group.minimum"
                        class="min-max-input"
                        @change="updateGroup(group)"
                      />
                    </div>
                    <div class="col-6 q-pr-sm">
                      <q-input
                        dense
                        stack-label
                        label="Máximo"
                        v-model="group.maximum"
                        class="min-max-input"
                        @change="updateGroup(group)"
                      />
                    </div>
                    <div class="col-6 q-pr-sm">
                      <q-select
                        map-options
                        label="Tipo de Cálculo"
                        v-model="group.priceCalculation"
                        :options="price_calculation"
                        @update:model-value="updateGroup(group)"
                      />
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </q-card-section>
            <q-card-section v-if="expandedGroup[index]">
              <q-list bordered>
                <ProductGroupProduct
                  :key="key"
                  :products="group.products"
                  :productGroup="group['@id']"
                  :ProductId="ProductId"
                  @update="loadData"
                />
              </q-list>
            </q-card-section>
          </q-card>
        </div>
      </q-expansion-item>
    </q-list>
  </div>
</template>
<script>
import { mapActions, mapGetters } from "vuex";
import ProductGroupProduct from "./components/product_group_product.vue";

export default {
  components: {
    ProductGroupProduct,
  },
  props: {
    ProductId: {
      required: false,
    },
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
    }),
    configs() {
      return {
        filters: true,
        store: "product_group",
        selection: false,
        search: {},
        components: {},
      };
    },
    filters() {
      return this.$copyObject(
        this.$store.getters[this.configs.store + "/filters"]
      );
    },
  },
  data() {
    return {
      key: 0,
      expandedGroup: {},
      product_groups: [],
      price_calculation: [
        {
          value: "sum",
          label: "Soma",
        },
        {
          value: "average",
          label: "Média",
        },
        {
          value: "biggest",
          label: "Maior",
        },
        {
          value: "free",
          label: "Brinde",
        },
      ],
    };
  },

  methods: {
    ...mapActions({
      getProductGroups: "product_group/getItems",
      saveProductGroups: "product_group/save",
    }),
    updateGroup(group) {
      let data = this.$copyObject(group);
      delete data.products;
      data.minimum = parseFloat(data.minimum);
      data.maximum = parseFloat(data.maximum);
      data.groupOrder = parseFloat(data.groupOrder);
      data.productGroup = data.productGroup + "";
      data.priceCalculation =
        data.priceCalculation.value || data.priceCalculation;
      this.saveProductGroups(data).then(() => {
        this.$q.notify({
          message: this.$translate(this.configs.store, "success", "message"),
          position: "bottom",
          type: "positive",
        });
      });
    },
    loadData() {
      if (this.myCompany) {
        this.filters.people = this.myCompany.id;
        this.getProductGroups(this.filters)
          .then((response) => {
            this.product_groups = this.$copyObject(response);
          })
          .finally(() => {
            this.key++;
          });
      }
    },
  },
  watch: {
    myCompany() {
      this.loadData();
    },
    isLoading(isLoading) {
      if (isLoading) this.$q.loading.show();
      else this.$q.loading.hide();
    },
  },
  created() {
    let filters = {
      product: this.ProductId,
    };
    this.$store.commit(this.configs.store + "/SET_FILTERS", filters);
    this.loadData();
  },
};
</script>
<style>
.min-max-input {
  max-width: 100%;
}
.required-label {
  position: absolute;
  font-size: 12px;
}
.required-input {
  margin-top: 20px;
}
</style>
