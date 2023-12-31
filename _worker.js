export default {
	async fetch(request, env) {
		const path = new URL(request.url).pathname;
		let token;

		switch (path) {
			case "/authenticate":
				return Response.redirect(`https://github.com/login/oauth/authorize?client_id=${env.CLIENT_ID}&redirect_uri=${env.REDIRECT_URI}`);
			case "/callback":
				const code = new URL(request.url).searchParams.get("code");
				token = await fetch("https://github.com/login/oauth/access_token", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify({
						client_id: env.CLIENT_ID,
						client_secret: env.CLIENT_SECRET,
						code,
					}),
				}).then((res) => res.json()).then((data) => data.access_token);

				return new Response(`<!doctype html>
				  <html><body>
				    <script type='application/javascript'>
				      window.localStorage.setItem('token', '${token}');
				      window.location.href = '/';
				    </script>
				  </body></html>`, {
				  headers: {
				    'Content-Type': 'text/html'
				  }
				});
			case "/repositories":
				token = request.headers.get("Authorization");

				if (!token) {
					return new Response("Unauthorized", { status: 401 });
				}

				// query the graphQL api to get the name and description of each of the users repositories
				const response = await fetch("https://api.github.com/graphql", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
						"user-agent": "node.js"
					},
					body: JSON.stringify({
						query: `query {
							viewer {
								repositories(first: 100) {
									nodes {
										name
										description
										url
									}
								}
							}
						}`,
					}),
				});

				try {
					const json = await response.json();

					return new Response(JSON.stringify(json.data.viewer.repositories.nodes));
				} catch (e) {
					return new Response(e.message, { status: response.status });
				}
			default:
				return env.ASSETS.fetch(request);
		}
	},
};
