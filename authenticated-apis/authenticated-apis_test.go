package main

import (
	"encoding/json"
	"testing"

	"github.com/aws/aws-cdk-go/awscdk"
	"github.com/stretchr/testify/assert"
	"github.com/tidwall/gjson"
)

func TestAuthenticatedApisStack(t *testing.T) {
	// GIVEN
	app := awscdk.NewApp(nil)

	// WHEN
	stack := NewAuthenticatedApisStack(app, "MyStack", nil)

	// THEN
	bytes, err := json.Marshal(app.Synth(nil).GetStackArtifact(stack.ArtifactId()).Template())
	if err != nil {
		t.Error(err)
	}

	template := gjson.ParseBytes(bytes)

	productsTable := template.Get("Resources.ProductsTable*")
	assert.Equal(t, "Delete", productsTable.Get("DeletionPolicy").String())

	addProductFunction := template.Get("Resources.AddProduct*")
	assert.NotNil(t, addProductFunction)
	addProductApiRoute := template.Get("Resources.ProductsApiPUTproducts*.Properties.RouteKey")
	assert.Equal(t, "PUT /products", addProductApiRoute.String())
}
