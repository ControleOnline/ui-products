<template>
  <DefaultTable :configs="configs" v-if="configs" />
</template>
<script>
export default {
  name: "Products",
  components: {
    //acoes
  },

  computed: {
    configs() {
      return {
        filters: true,
        store: "products",
        selection: false,
        search: {},
        categories: ["products"],
        components: {
          headerActions: [
            {
              component: this.$components.DefaultButtonDialog,
              configs: {
                component: this.$components.DefaultTable,
                icon: "person",
                add: true,
                "full-width": true,
                "full-height": true,
                delete: true,
                filters: true,
                selection: false,
                search: false,
                store: "queues",
              },
            },
          ],
        },
      };
    },
  },
  data() {
    return {};
  },
  created() {},
  methods: {},
};
</script>
