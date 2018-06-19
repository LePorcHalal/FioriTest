jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 Projects in the list
// * All 3 Projects have at least one Items

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/beyondtechnologies/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/beyondtechnologies/test/integration/pages/App",
	"com/beyondtechnologies/test/integration/pages/Browser",
	"com/beyondtechnologies/test/integration/pages/Master",
	"com/beyondtechnologies/test/integration/pages/Detail",
	"com/beyondtechnologies/test/integration/pages/Create",
	"com/beyondtechnologies/test/integration/pages/NotFound"
], function(Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.beyondtechnologies.view."
	});

	sap.ui.require([
		"com/beyondtechnologies/test/integration/MasterJourney",
		"com/beyondtechnologies/test/integration/NavigationJourney",
		"com/beyondtechnologies/test/integration/NotFoundJourney",
		"com/beyondtechnologies/test/integration/BusyJourney",
		"com/beyondtechnologies/test/integration/FLPIntegrationJourney"
	], function() {
		QUnit.start();
	});
});