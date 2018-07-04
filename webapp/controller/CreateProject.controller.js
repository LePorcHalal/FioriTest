sap.ui.define([
	"com/beyondtechnologies/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox"

], function(BaseController, JSONModel, MessageBox) {
	"use strict";

	return BaseController.extend("com.beyondtechnologies.controller.CreateProject", {

		_oBinding: {},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {
			var that = this;

			this.getRouter().getTargets().getTarget("createProject").attachDisplay(null, this._onDisplay, this);
			this._oODataModel = this.getOwnerComponent().getModel();
			this._oResourceBundle = this.getResourceBundle();
			this._oViewModel = new JSONModel({
				enableCreate: false,
				delay: 0,
				busy: false,
				mode: "create",
				viewTitle: "",
				FS: "",
				FS_SUP: "",
				FS_REV: "",
				TS: "",
				DEV_UT: "",
				DEV_SUP: "",
				FUT: "",
				FUT_SUP: "",
				FIT_SUP: "",
				TECH_ARCH: "",
				TECH_LEAD: "",
				dataArray: ""
			});
			this.setModel(this._oViewModel, "viewModel");

			// Register the view with the message manager
			sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
			var oMessagesModel = sap.ui.getCore().getMessageManager().getMessageModel();
			this._oBinding = new sap.ui.model.Binding(oMessagesModel, "/", oMessagesModel.getContext("/"));
			this._oBinding.attachChange(function(oEvent) {
				var aMessages = oEvent.getSource().getModel().getData();
				for (var i = 0; i < aMessages.length; i++) {
					if (aMessages[i].type === "Error" && !aMessages[i].technical) {
						that._oViewModel.setProperty("/enableCreate", false);
					}
				}
			});

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler (attached declaratively) for the view save button. Saves the changes added by the user. 
		 * @function
		 * @public
		 */
		onSave: function(oEvent) {
			var that = this,
				oModel = this.getModel();
			// abort if the  model has not been changed
			if (!oModel.hasPendingChanges()) {
				MessageBox.information(
					this._oResourceBundle.getText("noChangesMessage"), {
						id: "noChangesInfoMessageBox",
						styleClass: that.getOwnerComponent().getContentDensityClass()
					}
				);

				return;
			}
			this.getModel("appView").setProperty("/busy", true);

			this._updateChangedEntities();
			oModel.submitChanges();
			this.getRouter().getTargets().display("projects");
			this._resetDataFields();
		},
		
		/**
		 * Checks if it's a new id and if the combinaison of the Frice and the Complexity doesnt exist already
		 * @public
		 */
		 
			_customComplexity: function() {
			if (this.byId("COMPLEXITY_id").getSelectedKey() === "custom") {
				this.byId("CustomInput").setEnabled(true);

			} else {
				this.byId("CustomInput").setEnabled(false);
				this.byId("CustomInput").setValue("");

			}

		},
		checkIdFriceComplexity: function(oEvent) {

			var that = this;
			var exitFunction = false;
			var inputId = this.byId("ID_id").mProperties.value;
			var idString = "/EffortMatrix('" + inputId + "')";

			for (var temp in this.getModel().oData) {
				
				var complexityTemp;
				if (this.byId("CustomInput").getEnabled() === true) {
					
					complexityTemp =  "" + this.byId("CustomInput").getValue();
				} else {
					
					complexityTemp = "" + this.byId("COMPLEXITY_id").getSelectedItem().getText();
				}
			
				if (this.getModel().getProperty("/" + temp + "/FRICE") === this.byId("FRICE_id").getProperty("value") &&
					this.getModel().getProperty("/" + temp + "/COMPLEXITY") === complexityTemp &&
					this.getModel().getPendingChanges()[temp] === undefined) {

					MessageBox.error(
						"Cette combinaison de COMPLEXITY et FRICE a déjà été utilisée."
					);
					exitFunction = true;
					break;
				}
			}
			if (exitFunction === true) {
				return;
			}

			this.getModel().read(idString, {
				success: function() {
					MessageBox.error(
						"Ce ID a déjà été utilisé."
					);
					that.byId("ID_id").mProperties.value = "";
				},
				error: function() {
					that.onSave(oEvent);
				}

			});

		},
		/**
		 * Event handler (attached declaratively) for the view cancel button. Asks the user confirmation to discard the changes. 
		 * @function
		 * @public
		 */
		onCancel: function() {
			// check if the model has been changed
			if (this.getModel().hasPendingChanges()) {
				// get user confirmation first
				this._showConfirmQuitChanges(); // some other thing here....
			} else {
				this.getModel("appView").setProperty("/addEnabled", true);
				// cancel without confirmation
				this._navBack();
			}
		},

		/* =========================================================== */
		/* Internal functions
		/* =========================================================== */
		/**
		 * Navigates back in the browser history, if the entry was created by this app.
		 * If not, it navigates to the Projects page
		 * @private
		 */
		_navBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();

			this.getView().unbindObject();
			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				this.getRouter().getTargets().display("projects");
				this._resetDataFields();
			}
		},
		
		
		/**
		 * Opens a dialog letting the user either confirm or cancel the quit and discard of changes.
		 * @private
		 */
		_showConfirmQuitChanges: function() {
			var oComponent = this.getOwnerComponent(),
				oModel = this.getModel();
			var that = this;
			MessageBox.confirm(
				this._oResourceBundle.getText("confirmCancelMessage"), {
					styleClass: oComponent.getContentDensityClass(),
					onClose: function(oAction) {
						if (oAction === sap.m.MessageBox.Action.OK) {
							that.getModel("appView").setProperty("/addEnabled", true);
							oModel.resetChanges();
							that._navBack();
						}
					}
				}
			);
		},
		/**
		 * Prepares the view for editing the selected object
		 * @param {sap.ui.base.Event} oEvent the  display event
		 * @private
		 */
		 		_resetDataFields: function() {

			this.byId("COMPLEXITY_id").setSelectedItem(null);
			this.byId("CustomInput").setValue(null);
			this.byId("CustomInput").setEnabled(false);
			this._oViewModel.setProperty("/FS", "");
			this._oViewModel.setProperty("/FS_SUP", "");
			this._oViewModel.setProperty("/FS_REV", "");
			this._oViewModel.setProperty("/TS", "");
			this._oViewModel.setProperty("/DEV_UT", "");
			this._oViewModel.setProperty("/DEV_SUP", "");
			this._oViewModel.setProperty("/FUT", "");
			this._oViewModel.setProperty("/FUT_SUP", "");
			this._oViewModel.setProperty("/FIT_SUP", "");
			this._oViewModel.setProperty("/TECH_ARCH", "");
			this._oViewModel.setProperty("/TECH_LEAD", "");
			this.byId("FS_id")._iSetCount = 1;
			this.byId("FS_SUP_id")._iSetCount = 1;
			this.byId("FS_REV_id")._iSetCount = 1;
			this.byId("TS_id")._iSetCount = 1;
			this.byId("DEV_UT_id")._iSetCount = 1;
			this.byId("DEV_SUP_id")._iSetCount = 1;
			this.byId("FUT_id")._iSetCount = 1;
			this.byId("FUT_SUP_id")._iSetCount = 1;
			this.byId("FIT_SUP_id")._iSetCount = 1;
			this.byId("TECH_ARCH_id")._iSetCount = 1;
			this.byId("TECH_LEAD_id")._iSetCount = 1;
			
		},
		 	
		
		_checkIfBatchRequestSucceeded: function(oEvent) {
			var oParams = oEvent.getParameters();
			var aRequests = oEvent.getParameters().requests;
			var oRequest;
			if (oParams.success) {
				if (aRequests) {
					for (var i = 0; i < aRequests.length; i++) {
						oRequest = oEvent.getParameters().requests[i];
						if (!oRequest.success) {
							return false;
						}
					}
				}
				return true;
			} else {
				return false;
			}
		},
		
		_onEdit: function(oEvent) {
			var oData = oEvent.getParameter("data"),
				oView = this.getView();
			this._oViewModel.setProperty("/mode", "edit");
			this._oViewModel.setProperty("/enableCreate", true);
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("editViewTitle"));

			oView.bindElement({
				path: oData.objectPath
			});
		},

		/**
		 * Prepares the view for creating new object
		 * @param {sap.ui.base.Event} oEvent the  display event
		 * @private
		 */
		_onCreate: function(oEvent) {
			if (oEvent.getParameter("name") && oEvent.getParameter("name") !== "create") {
				this._oViewModel.setProperty("/enableCreate", false);
				this.getRouter().getTargets().detachDisplay(null, this._onDisplay, this);
				this.getView().unbindObject();
				return;
			}

			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("createProjectTitle"));
			this._oViewModel.setProperty("/mode", "create");
			var oContext = this._oODataModel.createEntry("EffortMatrix", {
				success: this._fnEntityCreated.bind(this),
				error: this._fnEntityCreationFailed.bind(this),

			});
			this.getView().setBindingContext(oContext);
		},

		/**
		 * Checks if the save button can be enabled
		 * @private
		 */
		_validateSaveEnablement: function() {
			var aInputControls = this._getFormFields(this.byId("newEntitySimpleForm"));
			var oControl;
			for (var m = 0; m < aInputControls.length; m++) {
				oControl = aInputControls[m].control;
				if (aInputControls[m].required) {
					var sValue = oControl.getValue();
					if (!sValue) {
						this._oViewModel.setProperty("/enableCreate", false);
						return;
					}
				}
			}
			this._checkForErrorMessages();
		},

		/**
		 * Checks if there is any wrong inputs that can not be saved.
		 * @private
		 */
		_checkForErrorMessages: function() {
			var aMessages = this._oBinding.oModel.oData;
			if (aMessages.length > 0) {
				var bEnableCreate = true;
				for (var i = 0; i < aMessages.length; i++) {
					if (aMessages[i].type === "Error" && !aMessages[i].technical) {
						bEnableCreate = false;
						break;
					}
				}
				this._oViewModel.setProperty("/enableCreate", bEnableCreate);
			} else {
				this._oViewModel.setProperty("/enableCreate", true);
			}
		},

		/**
		 * Handles the success of updating an object
		 * @private
		 */
		_fnUpdateSuccess: function() {
			this.getModel("appView").setProperty("/busy", false);
			this.getView().unbindObject();
			this.getRouter().getTargets().display("projects");
			this._resetDataFields();
		},

		/**
		 * Handles the success of creating an object
		 *@param {object} oData the response of the save action
		 * @private
		 */
		_fnEntityCreated: function(oData) {
			var sObjectPath = this.getModel().createKey("EffortMatrix", oData);
			this.getModel("appView").setProperty("/sObjectPath", sObjectPath);
			this.getModel("appView").setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			this.getModel("appView").setProperty("/busy", false);
			this._resetDataFields();
			this.getRouter().navTo("projects", {
				ID: encodeURIComponent(oData.ID)
			});

		},

		/**
		 * Handles the failure of creating/updating an object
		 * @private
		 */
		_fnEntityCreationFailed: function() {
			this.getModel("appView").setProperty("/busy", false);
			this.onCancel();
		},

		/**
		 * Handles the onDisplay event which is triggered when this view is displayed 
		 * @param {sap.ui.base.Event} oEvent the on display event
		 * @private
		 */
		_onDisplay: function(oEvent) {
			/*	var oData = oEvent.getParameter("data");
				if (oData && oData.mode === "update") {
					this._onEdit(oEvent);
				} else {   
			*/
			this._onCreate(oEvent);
			//	}
		},

		/**
		 * Gets the form fields
		 * @param {sap.ui.layout.form} oSimpleForm the form in the view.
		 * @private
		 */
		_getFormFields: function(oSimpleForm) {
			var aControls = [];
			var aFormContent = oSimpleForm.getContent();
			var sControlType;
			for (var i = 0; i < aFormContent.length; i++) {
				sControlType = aFormContent[i].getMetadata().getName();
				if (sControlType === "sap.m.Input" || sControlType === "sap.m.DateTimeInput" ||
					sControlType === "sap.m.CheckBox") {
					aControls.push({
						control: aFormContent[i],
						required: aFormContent[i - 1].getRequired && aFormContent[i - 1].getRequired()
					});
				}
			}
			return aControls;
		},


		/**
		 * Changes un undefined value (NaN) to "0"
		 *@param {integer} the value {string} the id of the input
		 * @private
		 */
		_naNToZero: function(value, id) {
			
				if (isNaN(value)) {
					if  ((this.byId(id)._iSetCount !== 1) && (id !== "TECH_id" ) && (id !== "FUNC_id")) {
						this.byId(id).setValueState("Error");
					}
					return 0;
				} else {
					if ((this.byId(id)._iSetCount !== 1) && (id !== "TECH_id" ) && (id !== "FUNC_id")) {
						this.byId(id).setValueState("None");
					}
					return value;
				}
		},
		/**
		 * Updates the value of "FUNC"
		 * @private
		 */
		 _updateChangedEntities: function() {
			if (this.byId("CustomInput").getEnabled() === true) {
				this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/COMPLEXITY", "" + this.byId("CustomInput").getValue());
			} else {
				this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/COMPLEXITY", "" + this.byId("COMPLEXITY_id").getSelectedItem()
					.getText());
			}
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/FS", "" + this._oViewModel.getData().FS);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/FS_SUP", "" + this._oViewModel.getData().FS_SUP);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/FS_REV", "" + this._oViewModel.getData().FS_REV);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/DEV_UT", "" + this._oViewModel.getData().DEV_UT);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/DEV_SUP", "" + this._oViewModel.getData().DEV_SUP);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/FUT", "" + this._oViewModel.getData().FUT);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/TS", "" + this._oViewModel.getData().TS);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/FUT_SUP", "" + this._oViewModel.getData().FUT_SUP);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/FIT_SUP", "" + this._oViewModel.getData().FIT_SUP);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/TECH_ARCH", "" + this._oViewModel.getData().TECH_ARCH);
			this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/TECH_LEAD", "" + this._oViewModel.getData().TECH_LEAD);

		},
		_updateFUNC: function() {

			var FUNC_field = this.byId("FUNC_id"),
				FS = this._naNToZero(parseFloat(this.byId("FS_id").getProperty("value")), "FS_id"),
				DEV_SUP = this._naNToZero(parseFloat(this.byId("DEV_SUP_id").getProperty("value")), "DEV_SUP_id"),
				FUT = this._naNToZero(parseFloat(this.byId("FUT_id").getProperty("value")), "FUT_id");

			var FUNC_value = FS + DEV_SUP + FUT;

			FUNC_field.setText(FUNC_value);
			this._updateGrandTotal();
			this._validateSaveEnablement();

		},

		/**
		 * Updates the value of "TECH"
		 * @private
		 */
		_updateTECH: function() {

			var TECH_field = this.byId("TECH_id"),
				FS_SUP = this._naNToZero(parseFloat(this.byId("FS_SUP_id").getProperty("value")), "FS_SUP_id"),
				FS_REV = this._naNToZero(parseFloat(this.byId("FS_REV_id").getProperty("value")), "FS_REV_id"),
				TS = this._naNToZero(parseFloat(this.byId("TS_id").getProperty("value")), "TS_id"),
				DEV_UT = this._naNToZero(parseFloat(this.byId("DEV_UT_id").getProperty("value")), "DEV_UT_id"),
				FUT_SUP = this._naNToZero(parseFloat(this.byId("FUT_SUP_id").getProperty("value")), "FUT_SUP_id"),
				FIT_SUP = this._naNToZero(parseFloat(this.byId("FIT_SUP_id").getProperty("value")), "FIT_SUP_id");

			var TECH_value = FS_SUP + FS_REV + TS + DEV_UT + FUT_SUP + FIT_SUP;

			TECH_field.setText(TECH_value);
			this._updateGrandTotal();
			this._validateSaveEnablement();

		},
		/**
		 * Updates the value of "GRAND_TOTAL"
		 * @private
		 */
		_updateGrandTotal: function() {

			var TECH = this._naNToZero(parseFloat(this.byId("TECH_id").getProperty("text")), "TECH_id"),
				FUNC = this._naNToZero(parseFloat(this.byId("FUNC_id").getProperty("text")), "FUNC_id"),
				TECH_ARCH = this._naNToZero(parseFloat(this.byId("TECH_ARCH_id").getProperty("value")), "TECH_ARCH_id"),
				TECH_LEAD = this._naNToZero(parseFloat(this.byId("TECH_LEAD_id").getProperty("value")), "TECH_LEAD_id");

			var GRAND_TOTAL = TECH + FUNC + TECH_ARCH + TECH_LEAD,
				GRAND_TOTAL_field = this.byId("GRAND_TOTAL_id");

			GRAND_TOTAL_field.setText(GRAND_TOTAL);
			this._validateSaveEnablement();

		}
	});

});