export const routes = [
  {
    path: "/products/",
    component: () =>  import ("@controleonline/ui-layout/src/layouts/AdminLayout.vue"),
    children: [
      {
        name: "ProductList",
        path: "",
        component: () =>  import ("../pages/list.vue"),
      },    
    ],
  },
  {
    path: "/product/",
    component: () =>  import ("@controleonline/ui-layout/src/layouts/AdminLayout.vue"),
    children: [
      {
        name: "ProductDetails",
        path: "id/:id",
        component: () =>  import ("../pages/details.vue"),
      },
      {
        name: "ProductNew",
        path: "new",
        component: () =>  import ("../pages/details.vue"),
      },
    ],
  },
  {
    path: "/machine/",
    component: () =>  import ("@controleonline/ui-layout/src/layouts/AdminLayout.vue"),
    children: [
      {
        name: "ProductFinder",
        path: "find",
        component: () =>  import ("../pages/finder.vue"),
      },
    ],
  },
];
