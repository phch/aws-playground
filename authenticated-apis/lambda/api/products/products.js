const crypto = require('crypto')
const AWS = require('aws-sdk')
const dynamo = new AWS.DynamoDB.DocumentClient()
const api = require('lambda-api')();

// Regex to validate path in format /products or /products/{id}
const productFields = ['id', 'title', 'description', 'price', 'imageUrl', 'rating', 'quantity'];
const allowedCreateAndUpdateFields = productFields.filter(field => field !== 'id'); // id is auto-generated

exports.handler = async function(event, context) {
  console.info('Received event: ', JSON.stringify(event, null, 2))
  return await api.run(event, context);
};

// Create
api.post('/products', async (req, res) => {
  if (!jsonContainsRequiredFieldsOnly(req.body, allowedCreateAndUpdateFields)) {
    console.error('Request to create new item must contain only required fields');
    return res.status(400).json({'error': `Request body must contain only required fields ${allowedCreateAndUpdateFields.join(', ')}`});
  }

  // Put item in table
  const dateISOString = new Date().toISOString();
  try {
    let params = {
      TableName: process.env.PRODUCTS_TABLE,
      Item: {
        id: crypto.randomUUID(),
        createdAt: dateISOString,
        lastModifiedAt: dateISOString
      }
    };
    allowedCreateAndUpdateFields.forEach(function(field) {
      params.Item[field] = req.body[field]
    });

    await dynamo.put(params).promise();
    console.info(`Created new item in ${process.env.PRODUCTS_TABLE} table with hash key ${params.Item.id}`);
    return res.status(201).location(`/products/${params.Item.id}`).json({'message': 'Created'});
  } catch (err) {
    console.error(`Error creating item in ${process.env.PRODUCTS_TABLE} table: ${err.message}`);
    return res.status(500).json({'error': err.message});
  }
});

// Read
api.get('/products/:productId', async (req, res) => {
  const productId = req.params.productId;
  if (!productId) {
    console.error('Request to get item must contain id in path');
    return res.status(400).json({'error': 'Request must contain path parameter id'});
  }

  // Put item in table
  try {
    let params = {
      TableName: process.env.PRODUCTS_TABLE,
      Key: {id: productId}
    }
    
    const result = await dynamo.get(params).promise();
    if (result.Item) {
      console.info(`Got item in ${process.env.PRODUCTS_TABLE} table with hash key ${params.Key.id}`);
      return res.status(200).json(result.Item);
    } else {
      console.warn(`Did not find item in ${process.env.PRODUCTS_TABLE} table with hash key ${params.Key.id}`);
      return res.status(404).json({'error': 'Item does not exist'});
    }
  } catch (err) {
    console.error(`Error getting item in ${process.env.PRODUCTS_TABLE} table: ${err}`);
    return res.status(500).json({'error': err.message});
  }
});

// Update
api.put('/products/:productId', async (req, res) => {
  const productId = req.params.productId;
  if (!productId) {
    console.error('Request to update item must contain id in path');
    return res.status(400).json({'error': 'Request must contain path parameter id'});
  }

  // Put item in table
  let shouldUpdate = false;
  const dateISOString = new Date().toISOString();
  try {
    let params = {
      TableName: process.env.PRODUCTS_TABLE,
      Key: {id: productId},
      UpdateExpression: 'set #lastModifiedAt = :lastModifiedAt,',
      ExpressionAttributeNames: {
        '#lastModifiedAt': 'lastModifiedAt'
      },
      ExpressionAttributeValues: {
        ':lastModifiedAt': dateISOString,
      },
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'NONE'
    }
    allowedCreateAndUpdateFields.forEach(function(field) {
      if (req.body[field]) {
        shouldUpdate = true;
        params.UpdateExpression += ` #${field} = :${field},`;
        params.ExpressionAttributeNames[`#${field}`] = field;
        params.ExpressionAttributeValues[`:${field}`] = req.body[field];
      }
    });
    params.UpdateExpression = params.UpdateExpression.slice(0, -1);

    if (!shouldUpdate) {
      console.error('Request to update item does not contain any fields to update');
      return res.status(400).json({'error': `Request body must contain at least one field to update from ${allowedCreateAndUpdateFields.join(', ')}`});
    }

    await dynamo.update(params).promise();
    console.info(`Updated item in ${process.env.PRODUCTS_TABLE} table with hash key ${params.Key.id}`);
    return res.status(200).json({'message': 'Updated'});
  } catch (err) {
    let statusCode = 500;
    if (err.code === 'ConditionalCheckFailedException') {
      err.message = 'Item does not exist';
      statusCode = 404;
    }
    console.error(`Error updating item in ${process.env.PRODUCTS_TABLE} table: ${err.message}`);
    return res.status(statusCode).json({'error': err.message});
  }
});

// Delete
api.delete('/products/:productId', async (req, res) => {
  const productId = req.params.productId;
  if (!productId) {
    console.error('Request to delete item must contain id in path');
    return res.status(400).json({'error': 'Request must contain path parameter id'});
  }

  // Put item in table
  try {
    let params = {
      TableName: process.env.PRODUCTS_TABLE,
      Key: {id: productId},
      ConditionExpression: 'attribute_exists(id)',
    }

    await dynamo.delete(params).promise();
    console.info(`Deleted item in ${process.env.PRODUCTS_TABLE} table with hash key ${params.Key.id}`);
    return res.status(200).json({'message': 'Deleted'});
  } catch (err) {
    let statusCode = 500;
    if (err.code === 'ConditionalCheckFailedException') {
      err.message = 'Item does not exist';
      statusCode = 404;
    }
    console.error(`Error deleting item in ${process.env.PRODUCTS_TABLE} table: ${err.message}`);
    return res.status(statusCode).json({'error': err.message});
  }
});

var jsonContainsRequiredFieldsOnly = function(json, fields) {
  if (Object.keys(json).length != fields.length) {
    console.warn('Json size: ' + Object.keys(json).length + ', fields size: ' + fields.length);
    return false;
  }
  for (const field of fields) {
    if (json[field] === undefined) {
      console.warn('Json missing field: ' + field);
      return false;
    }
  }
  return true;
}
