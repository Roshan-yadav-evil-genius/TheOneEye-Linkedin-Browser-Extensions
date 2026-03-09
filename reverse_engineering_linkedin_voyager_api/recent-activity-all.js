(async () => {
    // Get cookies
    const cookies = document.cookie
        .split("; ")
        .reduce((acc, c) => {
            const [k, v] = c.split("=");
            acc[k] = v;
            return acc;
        }, {});

    const jsessionid = (cookies["JSESSIONID"] || "").replace(/"/g, "");

    // Browser info
    const userAgent = navigator.userAgent;
    const acceptLanguage = navigator.languages ? navigator.languages.join(",") : navigator.language;

    let secChUa = "";
    let secChUaMobile = "?0";
    let secChUaPlatform = "";

    if (navigator.userAgentData) {
        secChUa = navigator.userAgentData.brands
            .map(b => `"${b.brand}";v="${b.version}"`)
            .join(", ");
        secChUaMobile = navigator.userAgentData.mobile ? "?1" : "?0";
        secChUaPlatform = `"${navigator.userAgentData.platform}"`;
    }

    // Define the components of the variables parameter
    const count = 20;
    const start = 0;
    // Ensure the profileUrn is correctly encoded *within* itself, but not re-encoded by the outer variables string
    const profileUrnValue = encodeURIComponent("urn:li:fsd_profile:ACoAAASiQI8BygAlP4P0v6SCBkesDTPnt6_azgY"); 

    // Construct the 'variables' string without encoding its structural characters
    // The commas, colons, and parentheses here are intentional and should not be encoded by encodeURIComponent() 
    // when applied to the whole 'variables' string. We'll construct the full URL carefully.
    const variablesString = `(count:${count},start:${start},profileUrn:${profileUrnValue})`;

    // Construct the full URL by manually appending parameters
    // We manually encode each parameter name and value as needed.
    const url = "https://www.linkedin.com/voyager/api/graphql" +
                `?includeWebMetadata=true` +
                `&variables=${variablesString}` + // The variablesString is already correctly formatted/encoded
                `&queryId=voyagerFeedDashProfileUpdates.4af00b28d60ed0f1488018948daad822`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": acceptLanguage,
            "csrf-token": jsessionid,
            "priority": "u=1, i",
            "referer": "https://www.linkedin.com/in/brenda-b-86705122/recent-activity/all/",
            "sec-ch-prefers-color-scheme": "light",
            "sec-ch-ua": secChUa,
            "sec-ch-ua-mobile": secChUaMobile,
            "sec-ch-ua-platform": secChUaPlatform,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": userAgent,
            "x-li-lang": "en_US",
            "x-restli-protocol-version": "2.0.0"
        }
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
})();