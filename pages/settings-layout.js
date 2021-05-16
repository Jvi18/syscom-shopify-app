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
    Filters
} from '@shopify/polaris';

import SyscomService from '../services/syscom-service';

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

    const handleFiltersClearAll = useCallback(() => {
        handleAvailabilityRemove();
        handleProductTypeRemove();
        handleTaggedWithRemove();
        handleQueryValueRemove();
    }, [
        handleAvailabilityRemove,
        handleQueryValueRemove,
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
                await SyscomService.addCustomProducts(products);
            } else {
                const filteredProd = products.filter(function (array_el) {
                    return selectedResources.filter(function (prod_id) {
                        return prod_id == array_el.producto_id;
                    }).length !== 0
                });

                await SyscomService.addCustomProducts(filteredProd);
            }

            alert("Productos Actualizados/agregados Correctamente.");
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
                    <TextStyle variation="subdued">{prod.producto_id}</TextStyle>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <TextStyle variation="subdued">{prod.titulo}</TextStyle>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <TextStyle variation="subdued">{(prod.precios.precio_descuento) ? prod.precios.precio_descuento : prod.precios.precio_1}</TextStyle>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Button onClick={ async () => { 
                        SyscomService.addCustomProducts([prod]);
                        alert("Producto Actualizados/agregados Correctamente.");
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
                return 'Categorias seleccionadas: '  + value.map((val) => `${choices.find(c => c.value ===val).label}`).join(', ');
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

class SettingsLayout extends React.Component {
    render() {
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
                            <Button onClick={() => SyscomService.auth()}>Generar Token</Button>
                        </Card>

                        <Card sectioned>
                            <TextContainer>
                                <Heading>Integrar todas las Categorias</Heading>
                                <p>
                                    Importa todas las categorias de principales de la API Syscom a tu Tienda, este paso es muy importante si planeas importar tus productos.
                                </p>
                            </TextContainer>
                            <br />
                            <Button onClick={() => SyscomService.setCategories()}>Integrar</Button>
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

                </Layout>
            </Page>
        );
    }
}

export default SettingsLayout;