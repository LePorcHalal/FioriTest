jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"com/beyondtechnologies/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/beyondtechnologies/test/integration/pages/App",
	"com/beyondtechnologies/test/integration/pages/Browser",
	"com/beyondtechnologies/test/integration/pages/Master",
	"com/beyondtechnologies/test/integration/pages/Detail",
	"com/beyondtechnologies/test/integration/pages/NotFound"
], function(Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.beyondtechnologies.view."
	});

	sap.ui.require([
		"com/beyondtechnologies/test/integration/NavigationJourneyPhone",
		"com/beyondtechnologies/test/integration/NotFoundJourneyPhone",
		"com/beyondtechnologies/test/integration/BusyJourneyPhone"
	], function() {
		QUnit.start();
	});
});