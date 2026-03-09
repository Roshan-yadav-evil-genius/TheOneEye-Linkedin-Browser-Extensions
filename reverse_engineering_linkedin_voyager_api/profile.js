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

    const publicIdentifier = "brenda-b-86705122";

    const params = new URLSearchParams({
        decorationId: "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-91",
        memberIdentity: publicIdentifier,
        q: "memberIdentity"
    });

    const url = `https://www.linkedin.com/voyager/api/identity/dash/profiles?${params}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": acceptLanguage,
            "csrf-token": jsessionid,
            "priority": "u=1, i",
            "referer": window.location.href,
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