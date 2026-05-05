<template>
  <q-list  separator>
    <div v-for="(group, groupId) in groups" :key="groupId">
      <span>{{ group.productGroup }}</span>
      <q-item v-for="product in group.products" :key="product.id">
        <q-item-section side>
          <q-badge :label="'x' + product.quantity" color="primary" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ product.product.product }}</q-item-label>
          <q-item-label caption>Preço: R$ {{ product.price }}</q-item-label>
        </q-item-section>
      </q-item>
    </div>
  </q-list>
</template>
<script>
import { mapActions, mapGetters } from "vuex";

export default {
  components: {},
  props: {
    order_product: {
      default: null,
    },
  },
  data() {
    return {
      groups: [],
    };
  },

  created() {
    this.onRequest();
  },

  methods: {
    ...mapActions({
      getOrderProducts: "order_products/getItems",
    }),
    onRequest() {
      let filter = {
        order: this.order_product.order["@id"],
        parentProduct: this.order_product.product["@id"],
        orderProduct: this.order_product["@id"],
      };

      this.getOrderProducts(filter)
        .then((products) => {
          let grouped = products.reduce((acc, product) => {
            if (!product.productGroup) return acc;
            if (
              product.showInParentQueue === false ||
              product.show_in_parent_queue === false ||
              product.showProductGroupInQueue === false ||
              product.show_product_group_in_queue === false
            )
              return acc;
            const groupId = product.productGroup.id;
            if (!acc[groupId]) acc[groupId] = product.productGroup;
            if (!acc[groupId]["products"]) acc[groupId]["products"] = [];
            acc[groupId]["products"].push(product);
            return acc;
          }, {});

          this.groups = grouped;
        })
        .finally(() => {});
    },
  },
};
</script>
