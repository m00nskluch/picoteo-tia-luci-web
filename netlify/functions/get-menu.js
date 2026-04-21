import { createClient } from "@libsql/client/web";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  try {
    
    const TURSO_URL   = process.env.TURSO_URL;
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

    
    if (!TURSO_URL || !TURSO_TOKEN) {
      throw new Error(
        "Las variables de entorno TURSO_URL / TURSO_AUTH_TOKEN no están configuradas en Netlify."
      );
    }

    const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

    const result = await client.execute(
      "SELECT id, platillo, descripcion, variante, precio, imagen, categoria FROM menu_items ORDER BY categoria, platillo"
    );

    
    const seen = new Set();
    const rows = [];
    
    for (const row of result.rows) {
      const id = row[0];
      const keyStr = `${row[1]}-${row[3] || ''}`; 
      
      if (!seen.has(id) && !seen.has(keyStr)) {
        seen.add(id);
        seen.add(keyStr);
        rows.push({
          id:          row[0],
          platillo:    row[1],
          descripcion: row[2],
          variante:    row[3],
          precio:      row[4],
          imagen:      row[5],
          categoria:   row[6],
        });
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ data: rows }),
    };
  } catch (error) {
    console.error("Turso error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Error al cargar el menú", details: error.message }),
    };
  }
};
