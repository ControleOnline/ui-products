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
