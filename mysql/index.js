var mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config();

var pool  = mysql.createConnection({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USERNAME,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_DATABASE
});


class Mysql {
    constructor () {}

    testQuery () {
      return new Promise((resolve, reject) => {
        pool.query('SELECT * from temp_products', function (error, results, fields) {
            if (error) {
                throw error
            };
            resolve(results)
            // console.log('The solution is: ', results[0].solution);
        });
      });
    }

    getTempProducts () {
        return new Promise((resolve, reject) => {
            pool.query('SELECT * from temp_products', function (error, results, fields) {
                if (error) {
                    throw error
                };
                resolve(results)
                // console.log('The solution is: ', results[0].solution);
            });
        })
    }

    getImportedProducts () {
        return new Promise((resolve, reject) => {
            pool.query('SELECT * from imported_products', function (error, results, fields) {
                if (error) {
                    throw error
                };
                resolve(results)
                // console.log('The solution is: ', results[0].solution);
            });
        });
    }

    setTempProducts (data) {
        return new Promise((resolve, reject) => {
            pool.query('INSERT INTO temp_products SET ?', data, function (error, results, fields) {
                if (error) {
                    throw error
                };
                resolve(results)
                // console.log('The solution is: ', results[0].solution);
            });
        });
    }

    setProducts (data) {
        return new Promise((resolve, reject) => {
            pool.query('INSERT INTO imported_products SET ?', data, function (error, results, fields) {
                if (error) {
                    throw error
                };
                resolve(results)
                // console.log('The solution is: ', results[0].solution);
            });
        });
    }

    findImportedProduct (data) {
        return new Promise((resolve, reject) => {
            pool.query('SELECT * FROM imported_products WHERE product_id = ?', data.product_id, function (error, results, fields) {
                if (error) {
                    throw error
                };
                resolve(results)
                // console.log('The solution is: ', results[0].solution);
            });
        });
    }

    deleteTempProducts (data) {
        return new Promise((resolve, reject) => {
            pool.query('DELETE FROM temp_products WHERE product_id = ?', data.product_id, function (error, results, fields) {
                if (error) {
                    throw error
                };
                resolve(results)
                // console.log('The solution is: ', results[0].solution);
            });
        });
    }
}

module.exports = new Mysql()