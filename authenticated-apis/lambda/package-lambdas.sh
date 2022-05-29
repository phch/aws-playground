#!/bin/sh

package() {
    DIR=$1
    echo "Packaging Lambda function in $DIR..."
    cd $DIR
    rm function.zip
    zip -r function.zip . -x '*.zip'
    cd - # go back to previous directory
    echo "Done"
}

package api/products