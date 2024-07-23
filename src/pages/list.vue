<template>
  <DefaultTable :configs="configs" v-if="configs" />
</template>
<script>
import DefaultTable from "@controleonline/ui-default/src/components/Default/DefaultTable";

export default {
  name: "Products",
  components: {
    DefaultTable,
    //acoes
  },

  computed: {
    configs() {
      return {
        filters: true,
        store: "products",
        selection: false,
        search: {},
        components: {
          /*
          tableActions: {
            component: acoes,
            props: {
              teste: 1
            }
          }
          */
        },
      };
    },
  },
  data() {
    return {

    };
  },
  created() {},
  methods: {},
};
</script>
