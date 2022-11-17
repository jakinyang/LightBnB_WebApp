const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb',
});

pool.connect()
  .then(() => {
    console.log(`Pool connection successful`);
  })
  .catch((err) => {
    console.log('Pool connection error: ', err)
  })

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool.query(
    `SELECT * FROM users WHERE email = $1;`,
    [email]
    )
    .then((result) => {
      if(result.rows === null) return null
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool.query(
    `SELECT * FROM users WHERE id = $1;`,
    [id]
    )
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool.query(
    `INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;`,
    [user.id, user.email, user.password]
    )
    .then((result) => {
      console.log(result);
      return result;
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool.query(
    `
    SELECT p.*, res.start_date, res.end_date
    FROM reservations res
    JOIN properties p
    ON res.property_id = p.id
    GROUP BY p.id, res.id
    HAVING res.guest_id = $1
    LIMIT $2;
    `, [guest_id, limit]
  )
  .then((result) => {
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  const queryParams = [];
  let queryString = `
  SELECT p.*, AVG(pr.rating) AS average_rating
  FROM properties p
  JOIN property_reviews pr
  ON pr.property_id = p.id 
  `
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryParams.length === 1 ? queryString+= `WHERE ` : queryString += ` AND `;
    queryString += `city LIKE $${queryParams.length} `;
  }
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryParams.length === 1 ? queryString+= `WHERE ` : queryString+= ` AND `;
    queryString += `cost_per_night > $${queryParams.length} `;
  }
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    queryParams.length === 1 ? queryString+= `WHERE ` : queryString+= ` AND `;
    queryString += `cost_per_night < $${queryParams.length} `;
  }
  
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryParams.length === 1 ? queryString+= `WHERE ` : queryString+= ` AND `;
    queryString += `owner_id = $${queryParams.length} `;
    
  }

  queryString += `GROUP BY p.id `

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING AVG(pr.rating) > $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  
  console.log(queryString, queryParams);

  return pool.query(queryString,queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
