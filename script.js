document.addEventListener("DOMContentLoaded", function () { 
    let streetAddressInput = document.getElementById("streetAddress");
    let suggestionsList = document.getElementById("addressSuggestions")

    streetAddressInput.addEventListener("input", async function () {
        let query = streetAddressInput.value.trim().toUpperCase();

        if (query.length < 3) {
            suggestionsList.style.display = "none"; // Hide dropdown if too short
            return;
        }

        let apiUrl = `https://services3.arcgis.com/icrWMv7eBkctFu1f/arcgis/rest/services/ParcelHosted/FeatureServer/0/query?where=UPPER(FULLADDRESS) LIKE '%25${query}%25'%20and%20MUNICIPALITY='City of North Port'&outFields=FULLADDRESS,ID&returnGeometry=false&f=json`;

        try {
            let response = await fetch(apiUrl);
            if (!response.ok) throw new Error("API Error");

            let data = await response.json();
            suggestionsList.innerHTML = ""; // Clear previous results

            if (!data.features || data.features.length === 0) {
                suggestionsList.style.display = "none";
                return;
            }

            data.features.forEach(feature => {
                let li = document.createElement("li");
                li.textContent = feature.attributes.FULLADDRESS;
                li.dataset.id = feature.attributes.ID; // Store Parcel ID

                li.addEventListener("click", function () {
                    streetAddressInput.value = li.textContent;
                    suggestionsList.style.display = "none";
                });

                suggestionsList.appendChild(li);
            });

            suggestionsList.style.display = "block"; // Show dropdown
        } catch (error) {
            console.error("Error fetching address data:", error);
        }
    });

    // Hide dropdown if user clicks outside
    document.addEventListener("click", function (event) {
        if (!streetAddressInput.contains(event.target) && !suggestionsList.contains(event.target)) {
            suggestionsList.style.display = "none";
        }
    });
    
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
    
    function clearInputs() {
        document.getElementById("streetAddress").value = "";
        document.getElementById("parcelID").value = "";
        document.getElementById("assessedValue").value = "";
        document.getElementById("exemptionValue").value = "";
    }

    document.getElementById("fetchData").addEventListener("click", async function () {
        let streetAddress = document.getElementById("streetAddress").value.trim().toUpperCase();
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
        if (parcelID !== "" && streetAddress === "") { 
            apiSuccess = await fetchPropertyDataByParcel(parcelID); // Returns true if successful
        }

        if (parcelID === "" && streetAddress !== "") { 
            apiSuccess = await fetchPropertyDataByAddress(streetAddress); // Returns true if successful
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
                <strong>Assessed Property Value:</strong> $${assessedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <br>
                <strong>Exemption Amount:</strong> $${exemptionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <br>
                <strong>Taxable Value:</strong> $${taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
            `;
    
            document.getElementById("taxableOutput").innerHTML = `
                <strong>PD Headquarters' Share of Property Tax:</strong> $${parseFloat(projectTaxAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per year
            `;
    
            clearInputs(); 
    
            return;
        }

        // Validate inputs
let hasStreetAddress = streetAddress !== "";
let hasParcelID = parcelID !== "";
let hasAssessedValue = assessedValueInput !== "";
let hasExemptionValue = exemptionValueInput !== "";  // Exemptions are optional

// 1️ No Inputs Provided
if (!hasStreetAddress && !hasParcelID && !hasAssessedValue && !hasExemptionValue) {
    document.getElementById("output").innerText = "Please enter a Property Address, a Parcel ID, or the Assessed Value (Exemptions are optional).";
    clearInputs();
    return;
}

// 2️ Too Many Inputs Provided (Parcel ID + Manual Inputs)
if (hasParcelID && (hasAssessedValue || hasExemptionValue)) {
    document.getElementById("output").innerText = "Please enter only a Parcel ID OR the Assessed Value & Exemptions.";
    clearInputs();
    return;
}

// 3️ Too Many Inputs Provided (Street Address + Manual Inputs)
if (hasStreetAddress && (hasAssessedValue || hasExemptionValue)) {
    document.getElementById("output").innerText = "Please enter only a Property Address OR the Assessed Value & Exemptions.";
    clearInputs();
    return;
}

// 4️ Both Parcel ID and Address Entered
if (hasParcelID && hasStreetAddress) {
    document.getElementById("output").innerText = "Please enter either a Property Address OR a Parcel ID, not both.";
    clearInputs();
    return;
}

// 5️ Incomplete Manual Inputs (User entered only Exemption Value but no Assessed Value)
if (!hasParcelID && !hasStreetAddress && !hasAssessedValue && hasExemptionValue) {
    document.getElementById("output").innerText = "Please enter an Assessed Value. Exemptions are optional.";
    clearInputs();
    return;
}
    
});
    
    // Separate Function for API Fetch
    async function fetchPropertyDataByParcel(parcelID) {
        let apiUrl = `https://services3.arcgis.com/icrWMv7eBkctFu1f/arcgis/rest/services/ParcelHosted/FeatureServer/0/query?where=ID='${parcelID}'%20and%20MUNICIPALITY='City of North Port'&outFields=ID,FULLADDRESS,ASSD,TXBL,EXEMPTIONS,HOMESTEAD,HYPERLINK&outSR=4326&f=json`;
    
        try {
            let response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
            let data = await response.json();
            if (!data.features || data.features.length === 0) {
                document.getElementById("output").innerText = "No property found. Try again, or try manually entering your assessed and exemption values instead.";
                return false; // Signal that API did NOT return data
            }
    
            let property = data.features[0].attributes;
            let taxableValue = property.TXBL || 0;
    
            document.getElementById("output").innerHTML = `
                <strong>Property ID:</strong> ${property.ID} <br>
                <strong>Address:</strong> ${property.FULLADDRESS} <br>
                <strong>Assessed Value:</strong> $${property.ASSD?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "N/A"} <br>
                <strong>Taxable Value:</strong> $${taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <br>
                <a href="${property.HYPERLINK}" target="_blank">View Property Details</a>
            `;
    
            let projectTaxAmount = ((taxableValue * 0.618) / 1000).toFixed(2);
            document.getElementById("taxableOutput").innerHTML = `
                <strong>Estimated PD Headquarters Debt Service Portion:</strong> $${parseFloat(projectTaxAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per year
            `;
    
            clearInputs();  
    
            return true; // Signal that API was successful
        } catch (error) {
            console.error("Error fetching data:", error);
            document.getElementById("output").innerText = "An error occurred while fetching data.";
            return false; // Signal that API failed
        }
        
    }

    async function fetchPropertyDataByAddress(streetAddress) {
        let apiUrl = `https://services3.arcgis.com/icrWMv7eBkctFu1f/arcgis/rest/services/ParcelHosted/FeatureServer/0/query?where=FULLADDRESS='${streetAddress}'%20and%20MUNICIPALITY='City of North Port'&outFields=ID,FULLADDRESS,ASSD,TXBL,EXEMPTIONS,HOMESTEAD,HYPERLINK&outSR=4326&f=json`;
    
        try {
            let response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
            let data = await response.json();
            if (!data.features || data.features.length === 0) {
                document.getElementById("output").innerText = "No property found. Try again, or try manually entering your assessed and exemption values instead.";
                return false; // Signal that API did NOT return data
            }
    
            let property = data.features[0].attributes;
            let taxableValue = property.TXBL || 0;
    
            document.getElementById("output").innerHTML = `
                <strong>Property ID:</strong> ${property.ID} <br>
                <strong>Address:</strong> ${property.FULLADDRESS} <br>
                <strong>Assessed Value:</strong> $${property.ASSD?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "N/A"} <br>
                <strong>Taxable Value:</strong> $${taxableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <br>
                <a href="${property.HYPERLINK}" target="_blank">View Property Details</a>
            `;
    
            let projectTaxAmount = ((taxableValue * 0.618) / 1000).toFixed(2);
            document.getElementById("taxableOutput").innerHTML = `
                <strong>Estimated PD Headquarters Debt Service Portion:</strong> $${parseFloat(projectTaxAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per year
            `;
    
            clearInputs();
    
            return true; // Signal that API was successful
        } catch (error) {
            console.error("Error fetching data:", error);
            document.getElementById("output").innerText = "An error occurred while fetching data.";
            return false; // Signal that API failed
        }
        
    }
});