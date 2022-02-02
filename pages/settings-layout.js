import React, { useCallback, useRef, useState } from 'react';
import {
    TextStyle,
    Button,
    Card,
    Layout,
    Page,
    Heading,
    TextContainer,
    Modal,
    IndexTable,
    useIndexResourceState,
    Pagination,
    ChoiceList,
    Filters,
    TextField,
    Toast,
    Spinner,
    Frame,
} from '@shopify/polaris';

import SyscomService from '../services/syscom-service';


const SettingsLayout = () => {
    /* Modal Hooks and Actions */
    const [modalMsg, setModalMsg] = useState('');
    const [activeModal, setActiveModal] = useState(false);
    const [modalError, setModalError] = useState(false);

    /* Loader Hooks and Actions */
    const [activeLoader, setActiveLoader] = useState(false);

    /* Modal Markup */
    const ToastPopUp = () => {
        const toggleActive = useCallback(() => setActiveModal((activeModal) => !activeModal), []);

        const toastMarkup = activeModal ? (
            <Toast content={modalMsg} onDismiss={toggleActive} error={modalError} />
        ) : null;

        return (
            <div>
                <Frame>
                    {toastMarkup}
                </Frame>
            </div>
        );
    }

    /* Spinner Markup */
    const LoaderSpinner = () => {
        const spinnerMarkup = activeLoader ? (
            <Spinner accessibilityLabel="Loader For Syscom App" size="large" />
        ) : null;

        const spinnerStyles = activeLoader ? {
            position: "absolute",
            top: 0,
            background: "rgb(255 255 255 / 50%)",
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        } : {};

        return (
            <div style={spinnerStyles}>
                {spinnerMarkup}
            </div>
        );
    }

    async function getToken() {
        setActiveLoader(true);
        
        return SyscomService.auth().then((res) => {
            if (res.access_token) {
                setActiveLoader(false);
                setModalError(false);
                setModalMsg('Token Generado Exitosamente.');
                setActiveModal(true);
            } else {
                setActiveLoader(false);
                setModalError(true);
                setModalMsg('Error Generando el Token, intentelo de nuevo por favor.');
                setActiveModal(true);
            }
        });
    }

    async function importCategories() {
        setActiveLoader(true);

        return SyscomService.setCategories().then((res) => {
            if (res.response) {
                setActiveLoader(false);
                setModalError(false);
                setModalMsg(res.response);
                setActiveModal(true);
            } else {
                setActiveLoader(false);
                setModalError(true);
                setModalMsg('Error importando las categorias de syscom, intentelo de nuevo por favor.');
                setActiveModal(true); 
            }
        });
    }

    async function importProducts(prods) {
        setActiveLoader(true);

        return SyscomService.setSelectedProduct(prods).then((res) => {
            if (res && !res.error) {
                setActiveLoader(false);
                setModalError(false);
                setModalMsg(res.response);
                setActiveModal(true);
            } else {
                setActiveLoader(false);
                setModalError(true);
                setModalMsg(res.response);
                setActiveModal(true); 
            }
        })
    }

    const getAllCategories = async () => {
        let cats = [];
        cats = await SyscomService.getCategories();
        let newArr = [];

        if (cats.length) {
            cats.forEach(c => {
                newArr.push({
                    label: c.nombre,
                    value: c.id
                })
            });
        }

        return newArr;
    }

    function ModalExample() {
        const [pages, setPages] = useState(1);

        const [filterCategories, setFilterCategories] = useState([]);

        const [choices, setChoices] = useState([]);

        const [currentPage, setCurrentPage] = useState(1);

        const [active, setActive] = useState(false);

        const [first, setFirst] = useState(false);

        const [products, setProducts] = useState([]);

        const [loading, setLoading] = useState((products.length === 0) ? true : false);

        const buttonRef = useRef(null);

        const handleOpen = useCallback(() => {
            setActive(true);
            setFirst(true);
        }, []);

        const handleClose = useCallback(() => {
            setActive(false);
            setFirst(false);
        }, []);

        // filters
        const [availability, setAvailability] = useState(null);
        const [queryValue, setQueryValue] = useState(null);
        const [filterId, setFilterId] = useState(null);

        const handleAvailabilityChange = useCallback(
            (value) => {
                setAvailability(value);
                setLoading(true);

                SyscomService.getProducts(currentPage, queryValue, value).then(r => {
                    setProducts(r.productos);
                    setPages(r.paginas);
                    setFilterCategories(value);
                    setLoading(false);
                });
            },
            [],
        );

        const handleFilterIdChange = useCallback(
            (value) => {
                //regex
                const re = /\d+((,)\d+)?/g;
                if (value === '' || re.test(value)) {
                    setFilterId(value);
                }
            },
            []
        )

        const setFilterIds = async () => {
            setLoading(true);
            let allFilterIds;

            if (filterId.length === 0) {
                allFilterIds = new Array();
            } else {
                allFilterIds = filterId.replace(/, +/g, ",").split(",").map(Number);
            }

            allFilterIds = allFilterIds.filter(id => !isNaN(id));

            await SyscomService.getProductsById(allFilterIds).then(p => {
                console.log(p, " errors");
                if (p && !p.error) {
                    const filteredErrors = p.filter((value) => {
                        return value !== undefined;
                    });

                    setProducts(filteredErrors);
                    setPages(1);
                    setLoading(false);
                }
            });
        }

        const handleFiltersQueryChange = useCallback(
            (value) => {
                setQueryValue(value);
                setLoading(true);
                console.log("filtering", filterCategories);
                SyscomService.getProducts(currentPage, value, filterCategories).then(r => {
                    setProducts(r.productos);
                    setPages(r.paginas);
                    setLoading(false);
                });
            },
            [],
        );

        const handleAvailabilityRemove = useCallback(() => {
            setAvailability(null);
            setFilterCategories([]);
            setLoading(true);

            SyscomService.getProducts(currentPage, queryValue, filterCategories).then(r => {
                setProducts(r.productos);
                setPages(r.paginas);
                setLoading(false);
            });
        }, []);

        const handleQueryValueRemove = useCallback(() => {
            setQueryValue(null);
            setLoading(true);

            SyscomService.getProducts(currentPage, null, filterCategories).then(r => {
                setProducts(r.productos);
                setPages(r.paginas);
                setLoading(false);
            });
        }, []);

        const handleSearchIdRemove = useCallback(() => {
            setLoading(true);
            setFilterId(null);

            SyscomService.getProducts(currentPage, null, filterCategories).then(r => {
                setProducts(r.productos);
                setPages(r.paginas);
                setLoading(false);
            });
        }, [])

        const handleFiltersClearAll = useCallback(() => {
            handleAvailabilityRemove();
            handleProductTypeRemove();
            handleTaggedWithRemove();
            handleQueryValueRemove();
            handleSearchIdRemove();
        }, [
            handleAvailabilityRemove,
            handleQueryValueRemove,
            handleSearchIdRemove
        ]);

        if (active && first) {
            SyscomService.getProducts(currentPage, queryValue, filterCategories).then(r => {
                setProducts(r.productos);
                setPages(r.paginas);
                setFirst(false);
                setLoading(false);
            });
        }

        const resourceName = {
            singular: 'product',
            plural: 'products',
        };

        const resourceIDResolver = (products) => {
            return products.producto_id;
        };

        const {
            selectedResources,
            allResourcesSelected,
            handleSelectionChange,
        } = useIndexResourceState(products, {
            resourceIDResolver,
        });

        const importSelectedProducts = async () => {
            if (products.length !== 0) {
                if (selectedResources.length === products.length) {
                    await importProducts(products);
                } else {
                    const filteredProd = products.filter(function (array_el) {
                        return selectedResources.filter(function (prod_id) {
                            return prod_id == array_el.producto_id;
                        }).length !== 0
                    });

                    await importProducts(filteredProd);
                }

            }
        }

        const rowMarkup = products.map(
            (prod, index) => (
                <IndexTable.Row
                    id={prod.producto_id}
                    key={prod.producto_id}
                    selected={selectedResources.includes(prod.producto_id)}
                    position={index}
                >
                    <IndexTable.Cell>
                        <TextStyle variation="subdued">{prod && prod.producto_id}</TextStyle>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <TextStyle variation="subdued">{prod && prod.titulo}</TextStyle>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <TextStyle variation="subdued">{(prod && prod.precios && prod.precios.precio_descuento) ? prod.precios.precio_descuento : (prod && prod.precios && prod.precios.precio_1) ? prod.precios.precio_1 : ''}</TextStyle>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Button onClick={async () => {
                            await importProducts([prod]);
                        }}>Importar/Actualizar</Button>
                    </IndexTable.Cell>
                </IndexTable.Row>
            ),
        );

        if (choices.length === 0) {
            getAllCategories().then(result => {
                setChoices(result);
            });
        }

        const filters = [
            {
                key: 'categories',
                label: 'Categorias',
                filter: (
                    <ChoiceList
                        title="Categorias"
                        titleHidden
                        choices={choices}
                        selected={availability || []}
                        onChange={handleAvailabilityChange}
                        allowMultiple
                    />
                ),
                shortcut: true,
            },
            {
                key: 'filterById',
                label: 'Busqueda por Codigo/ID',
                filter: (
                    <TextField
                        label="Filtrar por ID"
                        value={filterId}
                        onChange={handleFilterIdChange}
                        onBlur={setFilterIds}
                        labelHidden
                        helpText="Separar los ID's a traves de comas (solo tomaremos estos en cuenta en la búsqueda)"
                    />
                ),
                shortcut: true,
            },
        ];

        const appliedFilters = [];
        if (!isEmpty(availability)) {
            const key = 'categories';
            appliedFilters.push({
                key,
                label: disambiguateLabel(key, availability),
                onRemove: handleAvailabilityRemove,
            });
        }

        if (!isEmpty(filterId)) {
            const key = 'filterById';
            appliedFilters.push({
                key,
                label: disambiguateLabel(key, filterId),
                onRemove: handleSearchIdRemove,
            });
        }

        const activator = (
            <div ref={buttonRef}>
                <Button onClick={handleOpen}>Abrir lista</Button>
            </div>
        );

        return (
            <div>
                {activator}
                <Modal
                    activator={buttonRef}
                    open={active}
                    onClose={handleClose}
                    title="Productos Syscom"
                    primaryAction={{
                        content: 'Importar/Actualizar Productos',
                        onAction: async () => {
                            await importSelectedProducts();
                        },
                    }}
                >
                    <Modal.Section>
                        <Card>
                            <Card.Section>
                                <Filters
                                    queryValue={queryValue}
                                    filters={filters}
                                    appliedFilters={appliedFilters}
                                    onQueryChange={handleFiltersQueryChange}
                                    onQueryClear={handleQueryValueRemove}
                                    onClearAll={handleFiltersClearAll}
                                />
                            </Card.Section>

                            <IndexTable
                                loading={loading}
                                resourceName={resourceName}
                                itemCount={products.length}
                                selectedItemsCount={
                                    allResourcesSelected ? 'All' : selectedResources.length
                                }
                                onSelectionChange={handleSelectionChange}
                                headings={[
                                    { title: 'Id Producto' },
                                    { title: 'Nombre' },
                                    { title: 'Precio' },
                                    { title: 'Accion' },
                                ]}
                            >
                                {rowMarkup}
                            </IndexTable>

                            <Pagination
                                hasPrevious={(currentPage !== 1) ? true : false}
                                onPrevious={async () => {
                                    console.log('Previous');

                                    setCurrentPage(currentPage - 1);
                                    setLoading(true);

                                    await SyscomService.getProducts(currentPage - 1, queryValue, filterCategories).then(r => {
                                        setProducts(r.productos);
                                        setLoading(false);
                                    });
                                }}
                                hasNext={(currentPage != pages) ? true : false}
                                onNext={async () => {
                                    console.log('Next');
                                    setCurrentPage(currentPage + 1);
                                    setLoading(true);

                                    await SyscomService.getProducts(currentPage + 1, queryValue, filterCategories).then(r => {
                                        setProducts(r.productos);
                                        setLoading(false);
                                    });
                                }}
                            />
                        </Card>
                    </Modal.Section>
                </Modal>
            </div>
        );

        function disambiguateLabel(key, value) {
            switch (key) {
                case 'categories':
                    return 'Categorias seleccionadas: ' + value.map((val) => `${choices.find(c => c.value === val).label}`).join(', ');
                default:
                    return value;
            }
        }

        function isEmpty(value) {
            if (Array.isArray(value)) {
                return value.length === 0;
            } else {
                return value === '' || value == null;
            }
        }
    }

    return (
        <Page>
            <Layout>
                <Layout.AnnotatedSection
                    title="Syscom Integration"
                    description="Manejar API Syscom para importar productos a la tienda shopify"
                >
                    <Card sectioned>
                        <TextContainer>
                            <Heading>Generar token Syscom</Heading>
                            <p>
                                Genera un token para probar tus llamadas a la API de Syscom.
                            </p>
                        </TextContainer>
                        <br />
                        <Button onClick={async () => await getToken()}>Generar Token</Button>
                    </Card>

                    <Card sectioned>
                        <TextContainer>
                            <Heading>Integrar todas las Categorias</Heading>
                            <p>
                                Importa todas las categorias de principales de la API Syscom a tu Tienda, este paso es muy importante si planeas importar tus productos.
                            </p>
                        </TextContainer>
                        <br />
                        <Button onClick={async () => await importCategories()}>Integrar</Button>
                    </Card>

                    <Card sectioned>
                        <TextContainer>
                            <Heading>Lista de productos</Heading>
                            <p>
                                Lista de productos de Syscom API y los integrados en la tienda.
                            </p>
                        </TextContainer>
                        <br />
                        <ModalExample></ModalExample>
                    </Card>
                </Layout.AnnotatedSection>

                {/* Loader for all API Actions */}
                <LoaderSpinner></LoaderSpinner>

                {/* Pop Up modal for all API messages */}
                <ToastPopUp></ToastPopUp>
            </Layout>
        </Page>
    );
}

export default SettingsLayout;