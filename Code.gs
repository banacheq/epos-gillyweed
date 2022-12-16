/**
function onEdit(e) {
  handleEdit(e)
}

function handleEdit(e)
{
  var oldValue;
  var newValue;
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var activeCell = ss.getActiveCell();
  console.log(activeCell.getA1Notation());
  if(activeCell.getColumn() == 2 && ss.getActiveSheet().getName()=="Products") {
    newValue=e.value;
    oldValue=e.oldValue;
    if(!e.value) {
      activeCell.setValue("");
    }
    else {
      const re = new RegExp(newValue + ':?([0-9]*)');
      const match = oldValue.match(re);

      if( match == null )
      {
        activeCell.setValue(oldValue+', '+newValue);
      }
      else 
      {
        var quantity = Number(match[1])+1;
        if( quantity == 1 )
        {
          quantity = 2;
        }
        var replaceValue = oldValue;
      
        replaceValue = oldValue.replace( match[0], newValue + ":" + Number(quantity) );
        finalResult = replaceValue;
        activeCell.setValue(finalResult);

        //var quantity = Number(match[1])+1;
        //replaceValue.replace( match[0], newValue + ":" + (quantity + 1) );
        //activeCell.setValue(oldValue.replace( match[0], newValue + ":" + (quantity + 1) ));
      }
    }
  }
  else if( activeCell.getA1Notation() == "C1" && ss.getActiveSheet().getName()=="Functions" )
  {
    console.log("Function Selection");
    createOrder();
    activeCell.setValue("Select Function Here");
  }
}
 */

function getRole()
{
  return PropertiesService.getUserProperties().getProperty("ROLE");
}

function setRole()
{
  var result = SpreadsheetApp.getUi().prompt("Please enter your role");
  
  //Get the button that the user pressed.
  var button = result.getSelectedButton();
  
  if (button === SpreadsheetApp.getUi().Button.OK) {
    if( isValidRole( result.getResponseText() ) )
    {
      PropertiesService.getUserProperties().setProperty("ROLE", result.getResponseText());
    }
    else
    {
      SpreadsheetApp.getUi().alert("\"" + result.getResponseText() + "\" is not a valid role, see Staff sheet." );
    }
  }
}

function isValidRole( roleName )
{
  var valid = false;
  var roles = SpreadsheetApp.getActiveSpreadsheet().getRangeByName("StaffNames");
  if( roles )
  {
    for( var rowIndex = roles.getRow(), relRowIndex = 1; rowIndex <= roles.getLastRow(); ++rowIndex, ++relRowIndex )
    {
      var cell = roles.getCell( relRowIndex, 1 );
      if( cell.isBlank() ) { break; }
      if( cell.getValue().toString() == roleName ) { return true; }
    }
  }

  return valid;
}

function clearRole()
{
  PropertiesService.getUserProperties().setProperty("ROLE", "Unassigned");
}

function showRole()
{
  SpreadsheetApp.getUi().alert("Current Role: " + getRole() );
}

function onOpen() {
  var menu = SpreadsheetApp.getUi().createMenu("Order");

  menu.addItem("Create Order", "createOrder")
    .addSeparator();
    
  var selectedRole = getRole();
  if( selectedRole == null )
  {
    selectedRole = "Unassigned";
    PropertiesService.getUserProperties().setProperty("ROLE", selectedRole);
  }

  var staffMenu = SpreadsheetApp.getUi().createMenu("Staff");
  staffMenu.addItem("Show Current Role", "showRole" );
  staffMenu.addItem("Change Role", "setRole" );
  staffMenu.addItem("Clear Role", "clearRole");

  menu.addSubMenu(staffMenu)
    .addSeparator()
    .addItem("Export Standalone Order Form", "exportStandaloneOrderForm")
    .addToUi();
}

function parseIngredients(ingredientsValue)
{
  var ingredientList = [];

  if( ingredientsValue != "")
  {
    var ingredientSplits = ingredientsValue.split(", ");
    ingredientSplits.forEach( 
      function (ing)
      {
        if( ing.indexOf(":") == -1 )
        {
          ingredientList.push( { "name": ing, "qty": 1 } );
        }
        else
        {
          qtySplits = ing.split(":");
          ingredientList.push( { "name": qtySplits[0], "qty": Number(qtySplits[1]) } );
        }
      } );
  }

  return ingredientList;
}

function getProducts()
{
  var products = [];
  var productRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName("Products");
  if( productRange )
  {
    var valueGrid = productRange.getValues();
    for( var rowIndex=0; rowIndex < valueGrid.length; ++rowIndex )
    {
      if( valueGrid[rowIndex][0] == "" ) { break; }
      products.push( { "name": valueGrid[rowIndex][0], "ingredients": parseIngredients(valueGrid[rowIndex][1]), "cost": Number(valueGrid[rowIndex][2]), "rrp": Number(valueGrid[rowIndex][3]), "type": valueGrid[rowIndex][4] } );
    }
  }

  return products;
}

function getIngredients()
{
  var ingredients = [];
  var ingredientRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName("Ingredients");
  if( ingredientRange )
  {
    var valueGrid = ingredientRange.getValues();
    for( var rowIndex=0; rowIndex < valueGrid.length; ++rowIndex )
    {
      if( valueGrid[rowIndex][0] == "" ) { break; }
      ingredients.push( { "name": valueGrid[rowIndex][0], "cost": Number(valueGrid[rowIndex][1]) } );
    }
  }

  return ingredients;
}

function SUMINGREDIENTCOST( ingredientList )
{
  var ingredientCosts = getIngredients();
  var ingredients = parseIngredients(ingredientList);

  var cost = 0;
  for( var index = 0; index < ingredients.length; ++index )
  {
    var ingredientDef = ingredientCosts.find( value => value.name == ingredients[index].name );
    if( ingredientDef )
    {
      cost += ingredientDef.cost * ingredients[index].qty;
    }
  }

  return cost;
}

function getTax()
{
  var taxRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName("TaxRate");
  if( taxRange )
  {
    var taxCell = taxRange.getCell(1,1);
    if( !taxCell.isBlank() )
    {
      return Number(taxCell.getValue());
    }
  }

  return 0
}

function getDiscount()
{
  var discountRange = SpreadsheetApp.getActiveSpreadsheet().getRangeByName("Discount");
  if( discountRange )
  {
    var discountCell = discountRange.getCell(1,1);
    if( !discountCell.isBlank() )
    {
      return Number(discountCell.getValue());
    }
  }

  return 0
}

function instantiateStyleTemplate(filename, removeImage, standalone)
{
    var styleTemplate = HtmlService.createTemplateFromFile(filename);
    if( styleTemplate )
    {
      if( standalone )
      {
        styleTemplate.removeImage = "'x-mark.svg'";
      }
      else
      {
        styleTemplate.removeImage = "'data:image/svg+xml;base64," + Utilities.base64EncodeWebSafe(HtmlService.createHtmlOutputFromFile(removeImage).getContent()) + "'"
      }

      return styleTemplate.evaluate();
    }

    return null;
}

function instantiateTemplate(filename, style, removeImage, standalone)
{
  var template = HtmlService.createTemplateFromFile(filename);
  template.ingredientsDataFromServer = getIngredients();
  console.log(JSON.stringify(template.ingredientsDataFromServer));
  template.productsDataFromServer = getProducts();
  console.log(JSON.stringify(template.productsDataFromServer));
  template.taxRateFromServer = getTax();
  console.log(JSON.stringify(template.taxRateFromServer));
  template.discountFromServer = getDiscount();
  if( !standalone )
  {
    var styleOutput = instantiateStyleTemplate(style, removeImage, standalone);
    template.style = "<style>" + styleOutput.getContent() + "</style>";

    template.submitOrder="google.script.run.withSuccessHandler(function(){ if(closeOnOrderConfirmation){ google.script.host.close(); } else { resetOrder(); } }).submitOrder(_order);";
    template.confirmButton = "<div class=\"col\"><button id=\"confirmButton\" class=\"btn btn-outline-success\">Confirm</button></div>";
    //template.confirmButton += "<label for=\"closeSetting\">Keep Open </label><input type=\"checkbox\" id=\"closeSetting\" name=\"closeSetting\" /><div>&nbsp;</div>";
  }
  else
  {
    template.style = "    <link href=\"style.css\" rel=\"stylesheet\">";
    template.submitOrder="";
    template.confirmButton = "<div class=\"col\">Orders can only be submitted via Spreadsheet form</div>";
  }
  return template.evaluate();
}

function createOrder() {
  var widget = instantiateTemplate("Order.html", "style", "x-mark", false);
  widget.setWidth(1500);
  widget.setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(widget, 'Create Order');
}

function exportTemplateAsDownload(filename)
{
  // Passing false here disables the templated code that allows the submission of orders to the spreadsheet
  var htmlOutput = instantiateTemplate(filename, "style", "x-mark", true);
  ContentService.createTextOutput( htmlOutput.getContent() ).downloadAsFile(filename);
}

function createOrGetFolder(folderName)
{
  console.log("Enumerating folders called '" +folderName+"'");
  var folders = DriveApp.getFoldersByName(folderName);
  while( folders.hasNext() )
  {
    var folder = folders.next();
    console.log("Folder found: '" + folder.getName() +"'");
    if( folder.getName() == folderName )
    {
      return folder;
    }
  }

  console.log("No folder called '" + folderName +"' found, creating...");
  return DriveApp.createFolder(folderName);
}

function getFileInFolder( folder, filename )
{
  var filesIter = folder.getFilesByName( filename );
  while( filesIter.hasNext() )
  {
    var file = filesIter.next();
    if( file.getName() == filename )
    {
      return file;
    }
  }

  return null;
}

function createOrOverwriteFileInFolder( folder, filename, content, mimetype )
{
  var file = getFileInFolder( folder, filename );
  if( file )
  {
    file.setContent(content);
    return file;
  }
  else
  {
    return folder.createFile(filename, content, mimetype);
  }
}

function exportStandaloneOrderForm()
{
  var exportFolder = createOrGetFolder("BeanMachine");

  var removeImage = createOrOverwriteFileInFolder(exportFolder, "x-mark.svg", HtmlService.createHtmlOutputFromFile("x-mark").getContent(), "image/svg+xml" );
  var style = createOrOverwriteFileInFolder(exportFolder, "style.css", instantiateStyleTemplate("style", "x-mark", true).getContent(), "text/css");
  var orderForm = createOrOverwriteFileInFolder(exportFolder, "Order-standalone.html", instantiateTemplate("Order.html", "style", "x-mark", true).getContent(), "text/html");

  var zipFileBlob = Utilities.zip([orderForm, style, removeImage], exportFolder.getName() + ".zip" );

  var zipFile = getFileInFolder(DriveApp.getRootFolder(), exportFolder.getName() + ".zip" );
  if( zipFile )
  {
    DriveApp.getRootFolder().removeFile(zipFile);
    zipFile.getBlob().setBytes( zipFileBlob.getBytes() );
  }

  {
    zipFile = DriveApp.getRootFolder().createFile(zipFileBlob);
  }

  var htmlOutput = HtmlService
    .createHtmlOutput("<p><a href=\""+ zipFile.getDownloadUrl() +"\">Download</a></p>")
    .setTitle('Download');
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

function submitOrder(order)
{
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");
  var orderId = new Date().valueOf();
  var products = order.products.map( (product) => product.product.name + ":" + product.qty ).join(", ");
  console.log("Order submitted: " + orderId + products + order.cost + order.rrp + order.charge );
  sheet.appendRow([orderId, new Date(), getRole(), products, order.cost, order.rrp, order.charge, order.tax, order.net, order.profit]);
}

function doGet(e)
{
  var exportType = e.parameter.exportType;
  if( exportType == "order" )
  {
    exportTemplateAsDownload("Order-standalone.html");
  }

}
