require('isomorphic-fetch');
const dotenv = require('dotenv');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const { default: Shopify, ApiVersion } = require('@shopify/shopify-api');
const Router = require('koa-router');
const mysql = require('./mysql')

dotenv.config();

Shopify.Context.initialize({
	API_KEY: process.env.SHOPIFY_API_KEY,
	API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
	SCOPES: process.env.SHOPIFY_API_SCOPES.split(","),
	HOST_NAME: process.env.SHOPIFY_APP_URL.replace(/https:\/\//, ""),
	API_VERSION: ApiVersion.October20,
	IS_EMBEDDED_APP: true,
	accessMode: 'offline',
	SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const ACTIVE_SHOPIFY_SHOPS = {};

let accessTokenU = '';
let storeU = '';

const mainCategory = async (title, main) => {
	const mainCategoryQuery = `
    {
      collections(first: 20) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
    `;

	const response = await fetch(`https://${storeU}/admin/api/graphql.json`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Shopify-Access-Token": `${accessTokenU}`
		},
		body: JSON.stringify({
			query: mainCategoryQuery
		})
	})
		.then(result => {
			return result.json();
		})
		.then(async (dataQuery) => {
			//console.log("data returned:\n", dataQuery.data);
			if (!dataQuery.data.collections.edges.find(collection => collection.node.title === title)) {
				const createCollectionQuery = `
            mutation	{
              collectionCreate(
                  input:	{
                      title: "${title}",
                      descriptionHtml: "<p>${(main) ? 'Main' : ''} ${title} Collection for all the products that come from the Syscom API.</p>",
                      products: [],
                      ruleSet: {
                        appliedDisjunctively: false,
                        rules: [
                          {
                            column: VENDOR,
                            relation: EQUALS,
                            condition: "Syscom Api"
                          }
                          ${(!main) ?
						`{
                              column: TAG,
                              relation: EQUALS,
                              condition: "Syscom Api ${title}"
                            }`
						:
						``
					}
                        ]
                      } 
                  }
              )	
              {
                collection {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
            `;

				const newCollection = await fetch(`https://${storeU}/admin/api/graphql.json`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Shopify-Access-Token": `${accessTokenU}`
					},
					body: JSON.stringify({
						query: createCollectionQuery
					})
				})
					.then(result => {
						return result.json();
					})
					.then(data => {
						//console.log("data of created collection returned:\n", data);
						return data;
					});

				return 1;
			}

			return 0;
		});

	return response;
}

const mainProduct = async (product) => {
	const createProductQuery = `
        mutation {
            ${(false) ? `productUpdate` : `productCreate`} (
              input: {
                ${(false) ? `id: "${dataQuery.data.products.edges[0].node.id}"` : ``}
                descriptionHtml: "${product.description}"
                images: ${product.images}
                title: \"${product.title}\"
                vendor: "${product.vendor}"
                tags: "${product.tags}"
                variants: {
                  price: ${product.price}
                  weight: ${product.weight}
                  weightUnit: KILOGRAMS
				  inventoryItem: {
					cost: ${product.price}
					tracked: true
				  }
                  inventoryManagement: SHOPIFY
                  inventoryPolicy: DENY
                }
              }
            ) {
              product {
                id
              }
              userErrors {
                field
                message
              }
            }
        }
        `;

	const newProduct = await fetch(`https://${storeU}/admin/api/graphql.json`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Shopify-Access-Token": `${accessTokenU}`
		},
		body: JSON.stringify({
			query: createProductQuery
		})
	})
		.then(result => {
			return result.json();
		})
		.then(async (data) => {
			// console.log('test result ', product.product_id, data, createProductQuery, (data.errors) ? true : false);

			if (!data.errors) {
				await mysql.setProducts(product);
			}

			return data;
		});

	return newProduct;
}

app.prepare().then(() => {
	const server = new Koa();
	const router = new Router();
	server.keys = [Shopify.Context.API_SECRET_KEY];

	server.use(
		createShopifyAuth({
			afterAuth(ctx) {
				const { shop, scope, accessToken } = ctx.state.shopify;
				accessTokenU = accessToken;
				storeU = shop;

				ACTIVE_SHOPIFY_SHOPS[shop] = scope;

				if (ACTIVE_SHOPIFY_SHOPS[shop]) {
					ctx.redirect(`https://${shop}/admin/apps/syscom-integration-app`);
				} else {
					ctx.redirect(`/?shop=${shop}`);
				}
			},
		}),
	);

	router.post('/categories-import', async (ctx) => {
		ctx.body = ctx.request.body;
		ctx.body.categories.unshift({ id: 0, nombre: "Syscom API Product", level: 0 });
		const categories = ctx.body.categories;
		//console.log("body", ctx.body.categories);

		categories.map(async (c) => {
			const checkCategory = await mainCategory(c.nombre, (c.nombre === 'Syscom API Product') ? true : false);

			if (checkCategory === 0) {
				console.log('error on create ', c.nombre, 'collection');
			}
		});

		ctx.status = 200;
		ctx.body = { response: 'Colecciones/Categorias importadas correctamente' };
	});

	router.post('/products-import', async (ctx) => {
		ctx.body = ctx.request.body;
		const products = await mysql.getTempProducts();
		let responseMsg = "";
		let errorFlag = false;

		await Promise.all(products.map(async (p) => {
			const checkProduct = await mainProduct(p);
			
			if (checkProduct.errors) {
				errorFlag = true;
				responseMsg = ((responseMsg === '') ? '' : responseMsg + ', ') + `error al importar el producto ${p.title} con el id: ${p.product_id}`;
			}

			await mysql.deleteTempProducts(p);
		}));

		if (responseMsg === '') {
			responseMsg = 'Productos importados correctamente';
		}

		ctx.status = 200;
		ctx.body = { response: responseMsg, error: errorFlag };
	});

	router.get('/get-imported-products', async (ctx) => {
		let data = await mysql.getImportedProducts();

		ctx.status = 200;
		ctx.body = {
			response: 'Productos importados',
			data: data
		};
	});

	router.get('/get-temporal-products', async (ctx) => {
		let data = await mysql.getTempProducts();

		ctx.status = 200;
		ctx.body = {
			response: 'Productos temporales',
			data: data
		};
	});

	router.post('/save-products', async (ctx) => {
		ctx.body = ctx.request.body;
		const products = ctx.body.products;

		
		await Promise.all(products.map(async (p) => {
			const data = await mysql.setTempProducts(p);
		}));

		ctx.status = 200;
		ctx.body = { response: 'Productos importados correctamente' };
	});

	const handleRequest = async (ctx) => {
		await handle(ctx.req, ctx.res);
		ctx.respond = false;
		ctx.res.statusCode = 200;
	};

	router.get("/", async (ctx) => {
		const shop = ctx.query.shop;

		/*  let data = await mysql.testQuery()
	 
		 console.log(`ready db ${data}`); */

		if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
			ctx.redirect(`/auth?shop=${shop}`);
		} else {
			await handleRequest(ctx);
		}
	});

	router.get("(/_next/static/.*)", handleRequest);
	router.get("/_next/webpack-hmr", handleRequest);
	router.get("(.*)", verifyRequest(), handleRequest);

	/* server.use(async (ctx) => {
	  let data = await mysql.query()
  
	  console.log(`ready db ${data}`);
	  ctx.body = {
		  "code": 1,
		  "data": data,
		  "mesg": 'ok'
	  }  
	});
   */
	server.use(router.allowedMethods());
	server.use(bodyParser());
	server.use(router.routes());

	server.listen(port, () => {
		console.log(`> Ready on http://localhost:${port}`);
	});
});
