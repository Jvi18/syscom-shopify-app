import store from 'store-js';
require("dotenv").config();

const SyscomService = {
    auth: async function () {
        const requestOptions = {
            method: 'POST',
            body: `client_id=${process.env.syscomUser}&client_secret=${process.env.syscomUserSecret}&grant_type=client_credentials`,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        };

        return await fetch(process.env.syscomUrl + 'oauth/token', requestOptions)
            .then(response => response.json())
            .then(
                (result) => {
                    store.set('syscom_token', result.access_token);
                    return result;
                },
                (error) => {
                    console.log(error);
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
    getProductsById: async function (producstId) {
        if (producstId.length !== 0) {
            const productInfoHeader = {
                method: 'GET',
                headers: {
                    "Authorization": "Bearer " + store.get('syscom_token'),
                    "Content-Type": "application/json"
                },
            };

            return await Promise.all(producstId.map(async (productId) => {
                if (!isNaN(productId)) {
                    const item = await fetch(process.env.syscomUrl + 'api/v1/productos/' + productId, productInfoHeader)
                        .then(response => response.json())
                        .then(
                            async (result) => {
                                if (!result.error) {
                                    return result;
                                }

                                return;
                            },
                            (error) => {
                                console.log(error);
                            }
                        );

                    if (item) {
                        return item;
                    }
                }
            }));
        } else {
            return [];
        }
    },
    getProducts: async function (page, searchText, categories) {

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
            todo: true,
            stock: true,
            pagina: currentPage
        };

        if (searchText) {
            params.busqueda = searchText;
        }

        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        // console.log('url with params', url);

        const prods = await fetch(url, requestOptions)
            .then(response => response.json())
            .then(
                async (result) => {
                    //console.log('all the products ', result);
                    return result;
                },
                (error) => {
                    console.log(error);
                    return 0;
                }
            );

        return prods;
    },
    setCategories: async function () {
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

        return await fetch(process.env.syscomUrl + 'api/v1/categorias', requestOptions)
            .then(response => response.json())
            .then(
                async (result) => {
                    const requestOptions = {
                        method: 'POST',
                        body: JSON.stringify({
                            categories: result
                        }),
                        headers: { "Content-Type": "application/json" },
                    };

                    return await fetch('/categories-import', requestOptions)
                        .then(response => response.json())
                        .then(
                            (result) => {
                                return result;
                            },
                            (error) => {
                                console.log(error);
                            }
                        );
                },
                (error) => {
                    console.log(error);
                }
            );
    },
    setSelectedProduct: async function (products) {
        let newProds = [];
        let index = 0;
        let finalResponse;

        const importedProductsHeader = {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
        }

        await fetch('/get-imported-products', importedProductsHeader)
            .then(response => response.json())
            .then(
                (result) => {
                    // console.log('result man', result);

                    if (result.data.length !== 0) {
                        products = products.filter(product => !result.data.find(res => res.product_id == product.producto_id));

                        // console.log('filtered products', products);
                    }
                },
                (error) => {
                    console.log(error);
                }
            )

        /* For all selected products */
        if (products.length !== 0) {
            await Promise.all(products.map(async (prod) => {
                const productInfoHeader = {
                    method: 'GET',
                    headers: {
                        "Authorization": "Bearer " + store.get('syscom_token'),
                        "Content-Type": "application/json"
                    },
                };
    
                /* Search all individually product in API to get the complete fields */
                await fetch(process.env.syscomUrl + 'api/v1/productos/' + prod.producto_id, productInfoHeader)
                    .then(response => response.json())
                    .then(
                        async (result) => {
                            prod.descripcion = result.descripcion;
    
                            prod.imagenes = result.imagenes;
    
                            /* Modify image field to match Shopify image Query */
                            prod.imagenes = prod.imagenes.map(image => {
                                const newItem = {
                                    ...image,
                                    src: image.imagen
                                }
    
                                delete newItem.imagen;
                                delete newItem.orden;
    
                                return newItem;
                            });
    
                            prod.imagenes.unshift({ src: result.img_portada })
                            prod.imagenes = prod.imagenes;
    
                            /**
                             *  Find Actual Rate for the convertion
                             */
                            const convertHeader = {
                                method: 'GET',
                                headers: {
                                    "Content-Type": "application/json"
                                },
                            }
    
                            let url = new URL(process.env.currencyUrl + 'convert');
    
                            let params = {
                                api_key: process.env.currencyKey,
                                from: 'USD',
                                to: 'MXN',
                                format: 'json'
                            };
    
                            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
                            // Currency convertion for syscom product (USD => MXN)
                            prod.precios = await fetch(url, convertHeader)
                                .then(response => response.json())
                                .then(
                                    (result) => {
                                        return {
                                            /* precio_lista: (prod.precios.precio_lista) ? prod.precios.precio_lista * result.rates.MXN.rate : null, */
                                            precio_lista: (prod.precios.precio_lista) ? prod.precios.precio_lista * result.rates.MXN.rate : null,
                                            precio_descuento: (prod.precios.precio_descuento) ? prod.precios.precio_descuento * result.rates.MXN.rate : null,
                                            precio_especial: (prod.precios.precio_especial) ? prod.precios.precio_especial * result.rates.MXN.rate : null,
                                            precio_1: (prod.precios.precio_1) ? prod.precios.precio_1 * result.rates.MXN.rate : null
                                        }
                                    },
                                    (error) => {
                                        console.log(error);
                                    }
                                )
                        },
                        (error) => {
                            console.log(error);
                        }
                    );
    
                /* Push modified product into a new array of modified product for shopify  */
                let tags = [];
                prod.categorias.filter(c => c.nivel === 1).map(p => {
                    tags.push("Syscom Api " + p.nombre);
                });
    
                const updatedProduct = {
                    product_id: prod.producto_id,
                    title: `${prod.titulo.replace(/["]/g, "'")}`,
                    description: `${prod.titulo.replace(/["]/g, "'")} ${prod.marca} ${prod.modelo} <br /> ${prod.descripcion.replace(/[\\_]/g, "_")}`,
                    images: JSON.stringify(prod.imagenes, null, 4).replace(/"src"/g, "src"),
                    vendor: "Syscom Api",
                    tags: `${prod.producto_id},${tags}`,
                    price: (prod.precios.length === 0) ? 0 : (prod.precios.precio_especial) ? (prod.precios.precio_especial + (prod.precios.precio_especial * 0.16)) : (prod.precios.precio_lista + (prod.precios.precio_lista * 0.16)),
                    weight: (prod.peso != '-') ? prod.peso : 0,
                    amount: (prod.existencia.nuevo) ? prod.existencia.nuevo : 0,
                }
                newProds.push(updatedProduct);
    
                /* when all the product are in the new array execute the shopify importer */
                if (index === products.length - 1) {
                    const requestOptions = {
                        method: 'POST',
                        body: JSON.stringify({
                            products: newProds
                        }),
                        headers: { "Content-Type": "application/json" },
                    };
    
                    /* Set final response for all importerd products in shopify */
                    /*  finalResponse = await fetch('/products-import', requestOptions)
                         .then(response => response.json())
                         .then(
                             (result) => {
                                 return result;
                             },
                             (error) => {
                                 console.log(error);
                             }
                         ); */
    
                    /* Set final response for all importerd products in shopify */
                    await fetch('/save-products', requestOptions)
                        .then(response => response.json())
                        .then(
                            async (result) => {
                                // console.log('save products result', result);
    
                                if (result.response) {
                                    finalResponse = await fetch('/products-import', requestOptions)
                                        .then(response => response.json())
                                        .then(
                                            (result) => {
                                                return result;
                                            },
                                            (error) => {
                                                console.log(error);
                                            }
                                        );
                                }
                            },
                            (error) => {
                                console.log(error);
                            }
                        );
                }
    
                index++;
            }));
        } else {
            finalResponse = {
                response: 'Uno o mas productos ya se encuentran importados.',
                error: true
            }
        }


        /* Return response to frontend */
        return finalResponse;
    }
};


export default SyscomService;