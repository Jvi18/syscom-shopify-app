import store from 'store-js';
require("dotenv").config();

const SyscomService = {
    auth: async function () {
        this.setLoader = true;

        const requestOptions = {
            method: 'POST',
            body: `client_id=${process.env.syscomUser}&client_secret=${process.env.syscomUserSecret}&grant_type=client_credentials`,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        };

        fetch(process.env.syscomUrl + 'oauth/token', requestOptions)
            .then(response => response.json())
            .then(
                (result) => {
                    console.log(result);
                    store.set('syscom_token', result.access_token);
                    alert("Token Created Successfully.");
                    this.setLoader = false;
                },
                (error) => {
                    console.log(error);
                    this.setLoader = false;
                }
            );
    },

    setCategories: async function () {
        this.setLoader = true;

        if (store.get('syscom_token') === null) {
            this.auth();
        }

        const requestOptions = {
            method: 'GET',
            headers: {
                "Authorization": "Bearer " + store.get('syscom_token'),
                "Content-Type": "application/json"
            },
        };

        fetch(process.env.syscomUrl + 'api/v1/categorias', requestOptions)
            .then(response => response.json())
            .then(
                (result) => {
                    console.log('categories', result);

                    const requestOptions = {
                        method: 'POST',
                        body: JSON.stringify({
                            categories: result
                        }),
                        headers: { "Content-Type": "application/json" },
                    };

                    fetch('/categories-import', requestOptions)
                        .then(response => response.json())
                        .then(
                            (result) => {
                                console.log(result);
                                alert(result.response);
                            },
                            (error) => {
                                console.log(error);
                            }
                        );

                    this.setLoader = false;
                },
                (error) => {
                    console.log(error);
                    this.setLoader = false;
                }
            );
    },
    setProducts: async function () {
        this.setLoader = true;

        if (store.get('syscom_token') === null) {
            this.auth();
        }

        const requestOptions = {
            method: 'GET',
            headers: {
                "Authorization": "Bearer " + store.get('syscom_token'),
                "Content-Type": "application/json"
            },
        };

        fetch(process.env.syscomUrl + 'api/v1/categorias', requestOptions)
            .then(response => response.json())
            .then(
                async (result) => {
                    const currentCategories = result;

                    console.log('current cats', currentCategories);
                    let categoriesParam = '';

                    currentCategories.map((cat, index) => {
                        if (index === 0) {
                            categoriesParam = categoriesParam + cat.id;
                        } else {
                            categoriesParam = categoriesParam + ',' + cat.id;
                        }
                    });

                    let page = 1;
                    let end = false;

                    while (!end) {
                        let url = new URL(process.env.syscomUrl + 'api/v1/productos');

                        let params = {
                            categoria: categoriesParam,
                            marca: 'syscom',
                            todo: true,
                            stock: true,
                            pagina: page
                        };

                        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

                        console.log('url with params', url);

                        await fetch(url, requestOptions)
                            .then(response => response.json())
                            .then(
                                async (result) => {
                                    console.log('all the products ', result);
                                    const allPages = result.paginas;

                                    const requestOptions = {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            products: result.productos
                                        }),
                                        headers: { "Content-Type": "application/json" },
                                    };

                                    await fetch('/products-import', requestOptions)
                                        .then(response => response.json())
                                        .then(
                                            (result) => {
                                                console.log('resultado', result);
                                            },
                                            (error) => {
                                                console.log(error);
                                                end = true;
                                            }
                                        );

                                    if (page >= allPages) {
                                        end = true;
                                    }

                                    page = page + 1;
                                },
                                (error) => {
                                    console.log(error);
                                    end = true;
                                }
                            );
                    }

                    alert("All Products sucessfully imported");

                    this.setLoader = false;
                },
                (error) => {
                    console.log(error);
                    this.setLoader = false;
                }
            );
    },
    getCategories: async function () {
        if (store.get('syscom_token') === null) {
            this.auth();
        }

        const requestOptions = {
            method: 'GET',
            headers: {
                "Authorization": "Bearer " + store.get('syscom_token'),
                "Content-Type": "application/json"
            },
        };

        const res = await fetch(process.env.syscomUrl + 'api/v1/categorias', requestOptions)
            .then(response => response.json())
            .then(
                async (result) => {
                    console.log('categories', result);

                    return result;
                },
                (error) => {
                    console.log(error);
                }
            );

        return res;
    },
    getProducts: async function (page, searchText, categories) {
        this.setLoader = true;

        if (store.get('syscom_token') === null) {
            this.auth();
        }

        const requestOptions = {
            method: 'GET',
            headers: {
                "Authorization": "Bearer " + store.get('syscom_token'),
                "Content-Type": "application/json"
            },
        };

        let curCategories = [];
        let categoriesParam = '';

        if (categories.length === 0) {
            curCategories = await fetch(process.env.syscomUrl + 'api/v1/categorias', requestOptions)
                .then(response => response.json())
                .then(
                    async (result) => {
                        return result;
                    });

            curCategories.map((cat, index) => {
                if (index === 0) {
                    categoriesParam = categoriesParam + cat.id;
                } else {
                    categoriesParam = categoriesParam + ',' + cat.id;
                }
            });
        } else {
            curCategories = categories;

            curCategories.map((cat, index) => {
                if (index === 0) {
                    categoriesParam = categoriesParam + cat;
                } else {
                    categoriesParam = categoriesParam + ',' + cat;
                }
            });
        }

        let currentPage = page;

        let url = new URL(process.env.syscomUrl + 'api/v1/productos');

        let params = {
            categoria: categoriesParam,
            marca: 'syscom',
            todo: true,
            stock: true,
            pagina: currentPage
        };

        if (searchText) {
            params.busqueda = searchText;
        }

        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        console.log('url with params', url);

        const prods = await fetch(url, requestOptions)
            .then(response => response.json())
            .then(
                async (result) => {
                    console.log('all the products ', result);
                    return result;
                },
                (error) => {
                    console.log(error);
                    return 0;
                }
            );

        return prods;
    },
    addCustomProducts: async function (products) {
        const requestOptions = {
            method: 'POST',
            body: JSON.stringify({
                products: products
            }),
            headers: { "Content-Type": "application/json" },
        };

        await fetch('/products-import', requestOptions)
            .then(response => response.json())
            .then(
                (result) => {
                    console.log('resultado de agregar custom', result);
                },
                (error) => {
                    console.log(error);
                    end = true;
                }
            );
    }
};


export default SyscomService;