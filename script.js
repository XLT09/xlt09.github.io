document.addEventListener("DOMContentLoaded", function () { 

    document.querySelectorAll('input[type="number"]').forEach(input => {
        // Prevent non-numeric characters during typing
        input.addEventListener("keypress", function (event) {
            if (!/[\d]/.test(event.key)) { 
                event.preventDefault();
            }
        });
    
        // Ensure pasted values are numbers only
        input.addEventListener("input", function () {
            if (!/^\d*$/.test(this.value)) { // If non-numeric, reset field
                this.value = "";
            }
        });
    });
    
    document.querySelectorAll('#assessedValue, #exemptionValue').forEach(input => {
        input.addEventListener("input", function (event) {
            let rawValue = this.value.replace(/[^0-9]/g, ""); // Remove non-numeric characters
            
            if (rawValue === "") {
                this.value = ""; // Allow empty input
                return;
            }
    
            this.value = `$${Number(rawValue).toLocaleString()}`; // Format as currency
        });
    
        input.addEventListener("blur", function () {
            if (this.value === "") return;
            this.value = `$${Number(this.value.replace(/[^0-9]/g, "")).toLocaleString()}`; // Ensure proper formatting on blur
        });
    
        input.addEventListener("focus", function () {
            this.value = this.value.replace("$", ""); // Remove dollar sign when user focuses on input
        });
    });
    
    
document.getElementById("fetchData").addEventListener("click", async function () {
    let parcelID = document.getElementById("parcelID").value.trim();
    let assessedValueInput = document.getElementById("assessedValue").value.replace(/[^0-9]/g, "");
    let exemptionValueInput = document.getElementById("exemptionValue").value.replace(/[^0-9]/g, "");
    let assessedValue = assessedValueInput ? parseFloat(assessedValueInput) : NaN;
    let exemptionValue = exemptionValueInput ? parseFloat(exemptionValueInput) : NaN;
    let projectMillageRate = 0.6180; // Millage rate for PD Headquarters project
    let apiSuccess = false; // Track if API fetch was successful
    document.getElementById("output").innerHTML = "";
    document.getElementById("taxableOutput").innerHTML = "";
    document.getElementById("manualTaxOutput").innerHTML = "";


    // Fetch data from API if Parcel ID is entered
    if (parcelID !== "") { 
        apiSuccess = await fetchPropertyData(parcelID); // Returns true if successful
    }

    // Use Manual Inputs If API Failed or Not Used
    if (!apiSuccess && !isNaN(assessedValue)) {

        exemptionValue = isNaN(exemptionValue) ? 0 : exemptionValue;

        if (isNaN(assessedValue) || assessedValue <= 0) {
            document.getElementById("output").innerText = "Please enter a valid assessed property value.";
            return;
        }

        let taxableValue = assessedValue - exemptionValue;
        if (taxableValue < 0) taxableValue = 0; // Prevent negative taxable values

        let projectTaxAmount = ((taxableValue * projectMillageRate) / 1000).toFixed(2);

        // Display manual input results
        document.getElementById("manualTaxOutput").innerHTML = `
            <strong>Assessed Property Value:</strong> $${assessedValue.toLocaleString()} <br>
            <strong>Exemption Amount:</strong> $${exemptionValue.toLocaleString()} <br>
            <strong>Taxable Value:</strong> $${taxableValue.toLocaleString()} 
        `;

        document.getElementById("taxableOutput").innerHTML = `
            <strong>PD Headquarters' Share of Property Tax:</strong> $${parseFloat(projectTaxAmount).toLocaleString()}
        `;

        document.getElementById("parcelID").value = "";
        document.getElementById("assessedValue").value = "";
        document.getElementById("exemptionValue").value = "";   

        return;
    }

    // Error Message If No Inputs Were Provided
    if (parcelID === "" && assessedValueInput === "" && exemptionValueInput === "") {
        document.getElementById("output").innerText = "Please enter either a Parcel ID OR Assessed Value & Exemptions.";
        document.getElementById("taxableOutput").innerText = "";
    }

    // Error Message If Too Many Inputs Were Provided
    if (parcelID !== "" && assessedValueInput !== "" && exemptionValueInput !== "") {
        document.getElementById("output").innerText = "Please enter either a Parcel ID OR Assessed Value & Exemptions.";
        document.getElementById("taxableOutput").innerText = "";
    }

    // Error Message If Incomplete Manual Inputs Were Provided
    else if (parcelID === "" && assessedValueInput === "" && exemptionValueInput !== "") {
        document.getElementById("output").innerText = "Please enter either a Parcel ID OR Assessed Value & Exemptions.";
        document.getElementById("taxableOutput").innerText = "";
    }

    // Error Message If Parcel ID and a Manual Input Were Provided
    else if (parcelID !== "" && (assessedValueInput !== "" || exemptionValueInput !== "")) {
        document.getElementById("output").innerText = "Please enter either a Parcel ID OR Assessed Value & Exemptions.";
        document.getElementById("taxableOutput").innerText = "";
    }

    document.getElementById("parcelID").value = "";
    document.getElementById("assessedValue").value = "";
    document.getElementById("exemptionValue").value = "";
    
});

// Separate Function for API Fetch
async function fetchPropertyData(parcelID) {
    let apiUrl = `https://services3.arcgis.com/icrWMv7eBkctFu1f/arcgis/rest/services/ParcelHosted/FeatureServer/0/query?where=ID='${parcelID}'&outFields=ID,FULLADDRESS,ASSD,TXBL,EXEMPTIONS,HOMESTEAD,HYPERLINK&outSR=4326&f=json`;

    try {
        let response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        let data = await response.json();
        if (!data.features || data.features.length === 0) {
            document.getElementById("output").innerText = "No property found. Try manual entry instead.";
            return false; // Signal that API did NOT return data
        }

        let property = data.features[0].attributes;
        let taxableValue = property.TXBL || 0;

        document.getElementById("output").innerHTML = `
            <strong>Property ID:</strong> ${property.ID} <br>
            <strong>Address:</strong> ${property.FULLADDRESS} <br>
            <strong>Assessed Value:</strong> $${property.ASSD?.toLocaleString() || "N/A"} <br>
            <strong>Taxable Value:</strong> $${taxableValue.toLocaleString()} <br>
            <a href="${property.HYPERLINK}" target="_blank">View Property Details</a>
        `;

        let projectTaxAmount = ((taxableValue * 0.618) / 1000).toFixed(2);
        document.getElementById("taxableOutput").innerHTML = `
            <strong>PD Headquarters' Share of Property Tax:</strong> $${parseFloat(projectTaxAmount).toLocaleString()}
        `;

        document.getElementById("parcelID").value = "";
        document.getElementById("assessedValue").value = "";
        document.getElementById("exemptionValue").value = "";   

        return true; // Signal that API was successful
    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById("output").innerText = "An error occurred while fetching data.";
        return false; // Signal that API failed
    }
    
}


// use a separate call for property addresses - 
// determine if there is a good way we can do a 'like' against fulladdress using the arcgis api
//if not, use the scpa api pulled from property search page:
// 
// https://www.sc-pa.com/propertysearch/api/srch/ListAddresses?term=4970 city; 
//
// The following allows a live list display based on the 'like' criteria.
//
// $(document).ready(function () 
// { 
// AddressAutocompleteWrapper($("#AddressKeywords"), $("#AddressKeywords"), "/propertysearch/api/srch/ListAddresses"); $(document).tooltip({ 
// position: { my: "left top+15", at: "left bottom", collision: "flipfit" }, track: true, 
// tooltipClass: "custom-tooltip" 
// }); 
// });
//
//will need to extract Property ID from lookup results
});
