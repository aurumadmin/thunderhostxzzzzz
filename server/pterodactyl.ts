import { MCServer, PterodactylSettings } from "../src/types.js";
import { db } from "./db.js";

interface PteroCreationResult {
  pterodactylId: string;
  ipAddress: string;
  port: number;
  pteroUsername?: string;
  pteroPassword?: string;
}

interface PteroAllocation {
  id: number;
  ip: string;
  port: number;
}

async function findFreeAllocationOnNodes(
  nodeIds: number[],
  settings: PterodactylSettings
): Promise<PteroAllocation | null> {
  // Shuffle nodes to randomly distribute load when finding space
  const shuffledNodes = [...nodeIds].sort(() => Math.random() - 0.5);

  for (const nodeId of shuffledNodes) {
    try {
      const url = `${settings.panelUrl.replace(/\/$/, "")}/api/application/nodes/${nodeId}/allocations?per_page=100`;
      console.log(`[PTERODACTYL] Checking free allocations on Node ${nodeId}...`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${settings.applicationApiKey}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        console.error(`[PTERODACTYL] Node ${nodeId} allocations request returned status ${response.status}`);
        continue;
      }

      const payload = await response.json();
      const allocations = payload?.data || [];
      // Find an allocation that has assigned as false
      const free = allocations.find((alloc: any) => alloc?.attributes?.assigned === false);

      if (free) {
        console.log(`[PTERODACTYL] Selected free allocation ID ${free.attributes.id} (${free.attributes.ip}:${free.attributes.port}) on Node ${nodeId}`);
        return {
          id: free.attributes.id,
          ip: free.attributes.ip,
          port: free.attributes.port
        };
      }
    } catch (err) {
      console.error(`[PTERODACTYL] Error checking allocations for node ${nodeId}:`, err);
    }
  }

  return null;
}

async function getOrCreatePteroUser(
  email: string,
  settings: PterodactylSettings
): Promise<{ id: number; username: string; password?: string }> {
  const cleanEmail = email.trim();
  const searchUrl = `${settings.panelUrl.replace(/\/$/, "")}/api/application/users?filter[email]=${encodeURIComponent(cleanEmail)}`;
  
  try {
    console.log(`[PTERODACTYL] Querying client account for ${cleanEmail}...`);
    const searchRes = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${settings.applicationApiKey}`,
        "Accept": "application/json"
      }
    });

    if (searchRes.ok) {
      const payload = await searchRes.json();
      const usersList = payload?.data || [];
      const match = usersList.find((item: any) => item?.attributes?.email?.toLowerCase() === cleanEmail.toLowerCase());
      if (match) {
        console.log(`[PTERODACTYL] Found existing account: ID ${match.attributes.id}, Username ${match.attributes.username}`);
        
        // Check if first-time ordering (user doesn't have pteroPassword in DB)
        const dbUser = db.getUser(email);
        const hasPteroPassword = !!(dbUser && (dbUser as any).pteroPassword);

        if (!hasPteroPassword) {
          console.log(`[PTERODACTYL] First-time order detected for existing user ${cleanEmail}. Resetting password on Pterodactyl...`);
          
          const passwordChars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
          let generatedPassword = "";
          for (let i = 0; i < 12; i++) {
            generatedPassword += passwordChars.charAt(Math.floor(Math.random() * passwordChars.length));
          }

          const patchUrl = `${settings.panelUrl.replace(/\/$/, "")}/api/application/users/${match.attributes.id}`;
          const patchRes = await fetch(patchUrl, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${settings.applicationApiKey}`,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              username: match.attributes.username,
              email: match.attributes.email,
              first_name: match.attributes.first_name || "Minecraft",
              last_name: match.attributes.last_name || "Gamer",
              password: generatedPassword
            })
          });

          if (!patchRes.ok) {
            const errText = await patchRes.text();
            console.error(`[PTERODACTYL] Failed to reset user password. Status ${patchRes.status}: ${errText}`);
            return {
              id: match.attributes.id,
              username: match.attributes.username,
              password: "(Use your existing panel password)"
            };
          } else {
            console.log(`[PTERODACTYL] Successfully reset user password for ${cleanEmail}!`);
            db.updateUser(email, u => {
              (u as any).pteroPassword = generatedPassword;
              (u as any).pteroUsername = match.attributes.username;
            });
            return {
              id: match.attributes.id,
              username: match.attributes.username,
              password: generatedPassword
            };
          }
        } else {
          // Same user ordering again! Return the SAME password
          console.log(`[PTERODACTYL] Returning same password for existing order of ${cleanEmail}`);
          return {
            id: match.attributes.id,
            username: match.attributes.username,
            password: (dbUser as any).pteroPassword
          };
        }
      }
    }
  } catch (err) {
    console.error(`[PTERODACTYL] Error checking existing user:`, err);
  }

  // Generate username: alphanumeric, lowercase, length 4-32
  const emailPrefix = cleanEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const baseUsername = emailPrefix.substring(0, 15) || "gamer";
  const finalUsername = baseUsername + Math.floor(100 + Math.random() * 900);

  // Generate a premium random strong password for the user
  const passwordChars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  let generatedPassword = "";
  for (let i = 0; i < 12; i++) {
    generatedPassword += passwordChars.charAt(Math.floor(Math.random() * passwordChars.length));
  }

  const createUrl = `${settings.panelUrl.replace(/\/$/, "")}/api/application/users`;
  console.log(`[PTERODACTYL] Client account not found. Registering brand new user: ${finalUsername} (${cleanEmail})...`);
  
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${settings.applicationApiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      username: finalUsername,
      email: cleanEmail,
      first_name: "Minecraft",
      last_name: "Gamer",
      password: generatedPassword
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error(`[PTERODACTYL] Failed to register user. Status ${createRes.status}: ${errText}`);
    throw new Error(`Failed to create client account in panel: ${errText}`);
  }

  const result = await createRes.json();
  const attributes = result?.attributes || {};
  
  // Save credentials to local db user!
  db.updateUser(email, u => {
    (u as any).pteroPassword = generatedPassword;
    (u as any).pteroUsername = finalUsername;
  });

  return {
    id: attributes.id,
    username: finalUsername,
    password: generatedPassword
  };
}

export async function createPteroServer(
  server: MCServer,
  settings: PterodactylSettings
): Promise<PteroCreationResult> {
  const isSimulated = !settings.isConfigured || !settings.panelUrl || !settings.applicationApiKey;

  if (isSimulated) {
    console.log(`[PTERODACTYL SIMULATION] Creating server "${server.name}"`);
    const simulatedIps = [
      "158.69.123.45",
      "142.44.191.102",
      "51.254.120.30",
      "167.114.156.8"
    ];
    const nodeIp = simulatedIps[Math.floor(Math.random() * simulatedIps.length)];
    const port = Math.floor(Math.random() * 10000) + 25500;

    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simulation password handling
    const dbUser = db.getUser(server.ownerEmail);
    const hasPteroPassword = !!(dbUser && (dbUser as any).pteroPassword);
    let pteroPass = "sim_password_123";
    let pteroUser = "sim_user_" + server.ownerEmail.split("@")[0];

    if (!hasPteroPassword) {
      // First-time order! Generate random password
      const passwordChars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
      let genPass = "";
      for (let i = 0; i < 11; i++) {
        genPass += passwordChars.charAt(Math.floor(Math.random() * passwordChars.length));
      }
      pteroPass = "sim_pass_" + genPass;
      db.updateUser(server.ownerEmail, u => {
        (u as any).pteroPassword = pteroPass;
        (u as any).pteroUsername = pteroUser;
      });
    } else {
      pteroPass = (dbUser as any).pteroPassword || pteroPass;
      pteroUser = (dbUser as any).pteroUsername || pteroUser;
    }

    return {
      pterodactylId: "sim_" + Math.random().toString(36).substring(2, 9),
      ipAddress: nodeIp,
      port: port,
      pteroUsername: pteroUser,
      pteroPassword: pteroPass
    };
  }

  // --- Genuine Pterodactyl API Call ---
  try {
    const url = `${settings.panelUrl.replace(/\/$/, "")}/api/application/servers`;

    // 1. Get or create the client account for this server's owner email
    const pteroUser = await getOrCreatePteroUser(server.ownerEmail, settings);

    // 2. Try to find a free allocation on Node 2 or Node 3 first
    const freeAllocation = await findFreeAllocationOnNodes([2, 3], settings);

    let egg = parseInt(settings.eggId) || 2;
    let nest = parseInt(settings.nestId) || 1;
    let docker_image = settings.dockerImage || "ghcr.io/pterodactyl/yolks:java_25";
    let startup = "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}";
    let environment: any = {
      MINECRAFT_VERSION: "latest",
      SERVER_JARFILE: "server.jar",
      DL_VERSION: "latest",
      BUILD_NUMBER: "latest"
    };

    if (server.serverType === "bot") {
      if (server.botType === "nodejs") {
        nest = 5;
        egg = 15;
        docker_image = "ghcr.io/pterodactyl/yolks:nodejs_18";
        startup = "if [ -f package.json ]; then npm install && npm start; else node index.js; fi";
        environment = {
          USER_UPLOAD: "0",
          AUTO_RUN: "0",
          MAIN_FILE: "index.js",
          BOT_JS_FILE: "index.js",
          JS_FILE: "index.js",
          STARTUP: "node index.js",
          STARTUP_CMD: "node index.js",
          STARTUP_COMMAND: "node index.js",
          STARTUP_FILE: "index.js",
          STARTUP_1: "node index.js",
          STARTUP_CMD_1: "node index.js",
          STARTUP_COMMAND_1: "node index.js"
        };
      } else {
        nest = 5;
        egg = 16;
        docker_image = "ghcr.io/pterodactyl/yolks:python_3.10";
        startup = "if [ -f requirements.txt ]; then pip install -r requirements.txt; fi; python main.py";
        environment = {
          USER_UPLOAD: "0",
          AUTO_RUN: "0",
          MAIN_FILE: "main.py",
          BOT_PY_FILE: "main.py",
          PY_FILE: "main.py",
          STARTUP: "python main.py",
          STARTUP_CMD: "python main.py",
          STARTUP_COMMAND: "python main.py",
          STARTUP_FILE: "main.py",
          STARTUP_1: "python main.py",
          STARTUP_CMD_1: "python main.py",
          STARTUP_COMMAND_1: "python main.py"
        };
      }

      // Dynamically load variables from the panel to auto-satisfy any other required options
      try {
        const queryUrl = `${settings.panelUrl.replace(/\/$/, "")}/api/application/nests/${nest}/eggs/${egg}?include=variables`;
        console.log(`[PTERODACTYL] Dynamic check for Egg ${egg} required variables...`);
        const queryRes = await fetch(queryUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${settings.applicationApiKey}`,
            "Accept": "application/json"
          }
        });

        if (queryRes.ok) {
          const payload = await queryRes.json();
          const variables = payload?.attributes?.relationships?.variables?.data || payload?.relationships?.variables?.data || [];
          console.log(`[PTERODACTYL] Egg ${egg} variables response loaded, count: ${variables.length}`);
          
          for (const v of variables) {
            const attr = v?.attributes || {};
            const key = attr.env_variable;
            const name = attr.name || "";
            const default_val = attr.default_value !== null && attr.default_value !== undefined ? String(attr.default_value) : "";
            const isRequired = attr.rules && String(attr.rules).split("|").includes("required");

            if (key) {
              console.log(`[PTERODACTYL] Dynamic Variable Match: key="${key}" name="${name}" isRequired=${!!isRequired}`);
              // If variable is missing and is required, populate it
              if (isRequired && !environment[key]) {
                environment[key] = default_val || (server.botType === "python" ? "main.py" : "index.js");
                console.log(`[PTERODACTYL] Automatically satisfied required variable: ${key} = "${environment[key]}"`);
              }
            }
          }
        }
      } catch (err) {
        console.error("[PTERODACTYL] Dynamic variables detection failed (continuing with fallbacks):", err);
      }
    }

    const postPayload: any = {
      name: server.name,
      user: pteroUser.id,
      egg: egg,
      nest: nest,
      docker_image: docker_image,
      startup: startup,
      limits: {
        memory: server.ram,
        swap: 0,
        disk: server.disk,
        io: 500,
        cpu: server.cpu
      },
      feature_limits: {
        databases: 0,
        allocations: 1,
        backups: 0
      },
      environment: environment
    };

    if (freeAllocation) {
      // If we got a specific free allocation, use it directly!
      postPayload.allocation = {
        default: freeAllocation.id,
        additional: []
      };
    } else {
      // Otherwise, fall back to deploying to user's location setting
      console.log(`[PTERODACTYL] No direct free allocation found on Node 2 or Node 3. Falling back to deploying via location ID ${settings.locationId}`);
      postPayload.deploy = {
        locations: [parseInt(settings.locationId) || 1],
        dedicated_ip: false,
        port_range: []
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.applicationApiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(postPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed && parsed.errors && parsed.errors.length > 0) {
          message = parsed.errors.map((e: any) => e.detail || e.message || JSON.stringify(e)).join(", ");
        }
      } catch (e) {
        // Not JSON
      }
      throw new Error(`Pterodactyl API responded with status ${response.status}: ${message}`);
    }

    const data = await response.json();
    const attributes = data?.attributes || {};
    const allocations = attributes?.relationships?.allocations?.data || [];
    let ip = "ptero-node.thunderhost.club";
    let port = 25565;

    if (allocations.length > 0) {
      const allocationAttr = allocations[0]?.attributes || {};
      ip = allocationAttr.ip || ip;
      port = allocationAttr.port || port;
    }

    return {
      pterodactylId: attributes.id?.toString() || "ptero_" + Math.random().toString(36).substring(7),
      ipAddress: ip,
      port: port,
      pteroUsername: pteroUser.username,
      pteroPassword: pteroUser.password || "(Use your existing panel password)"
    };
  } catch (error: any) {
    console.error("Failed actual Pterodactyl server build:", error);
    // Propagate the actual error instead of silently falling back to simulation
    throw new Error(error?.message || String(error));
  }
}

export async function deletePteroServer(
  pterodactylId: string,
  settings: PterodactylSettings
): Promise<void> {
  if (!pterodactylId.startsWith("sim_") && settings.isConfigured && settings.panelUrl && settings.applicationApiKey) {
    try {
      const url = `${settings.panelUrl.replace(/\/$/, "")}/api/application/servers/${pterodactylId}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${settings.applicationApiKey}`,
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        console.error(`Ptero delete request returned status ${response.status}`);
      }
    } catch (e) {
      console.error("Failed true Pterodactyl deletion API call:", e);
    }
  } else {
    console.log(`[PTERODACTYL SIMULATION] Deleted server ${pterodactylId}`);
  }
}

export async function controlPteroPower(
  pterodactylId: string,
  action: "start" | "stop" | "restart",
  settings: PterodactylSettings
): Promise<void> {
  const isSimulated = pterodactylId.startsWith("sim_") || !settings.isConfigured || !settings.panelUrl || !settings.clientApiKey;

  if (isSimulated) {
    console.log(`[PTERODACTYL SIMULATION] Sending power signal "${action}" to server ${pterodactylId}`);
    return;
  }

  try {
    const url = `${settings.panelUrl.replace(/\/$/, "")}/api/client/servers/${pterodactylId}/power`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.clientApiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ signal: action })
    });
    if (!response.ok) {
      console.error(`Ptero power action returned status ${response.status}`);
    }
  } catch (err) {
    console.error("Failed true Pterodactyl power control API call:", err);
  }
}

export interface ServerMetrics {
  status: "running" | "stopped" | "suspended" | "starting";
  cpuUsage: number;
  ramUsage: number;
}

export async function getPteroServerStatus(
  pterodactylId: string,
  settings: PterodactylSettings,
  currentStatus: string
): Promise<ServerMetrics> {
  const isSimulated = pterodactylId.startsWith("sim_") || !settings.isConfigured || !settings.panelUrl || !settings.clientApiKey;

  if (isSimulated) {
    if (currentStatus === "suspended") {
      return { status: "suspended", cpuUsage: 0, ramUsage: 0 };
    }
    if (currentStatus === "stopped") {
      return { status: "stopped", cpuUsage: 0, ramUsage: 0 };
    }
    if (currentStatus === "creating") {
      return { status: "starting", cpuUsage: 45, ramUsage: 1024 };
    }

    // Otherwise simulate active Minecraft server fluctuations
    const cpuBase = 12 + Math.floor(Math.sin(Date.now() / 10000) * 8);
    const ramBase = 1850 + Math.floor(Math.cos(Date.now() / 8000) * 150);

    return {
      status: "running",
      cpuUsage: Math.max(2, Math.min(100, cpuBase)),
      ramUsage: Math.max(512, Math.min(4096, ramBase))
    };
  }

  // --- Real Pterodactyl Client Query ---
  try {
    const url = `${settings.panelUrl.replace(/\/$/, "")}/api/client/servers/${pterodactylId}/resources`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${settings.clientApiKey}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Status query returned ${response.status}`);
    }

    const data = await response.json();
    const stats = data?.attributes || {};
    const state = stats.current_state || "stopped";
    const cpu = stats.resources?.cpu_absolute || 0;
    const ram = Math.round((stats.resources?.memory_bytes || 0) / (1024 * 1024)); // to MB

    let finalStatus: "running" | "stopped" | "suspended" | "starting" = "stopped";
    if (state === "running") finalStatus = "running";
    if (state === "starting") finalStatus = "starting";
    if (currentStatus === "suspended") finalStatus = "suspended";

    return {
      status: finalStatus,
      cpuUsage: cpu,
      ramUsage: ram
    };
  } catch (e) {
    // Graceful fallback to periodic simulated fluctuations if target offline
    return {
      status: currentStatus === "suspended" ? "suspended" : "running",
      cpuUsage: currentStatus === "suspended" ? 0 : 15 + Math.floor(Math.random() * 10),
      ramUsage: currentStatus === "suspended" ? 0 : 1600 + Math.floor(Math.random() * 200)
    };
  }
}

export async function updatePteroServerBuild(
  pterodactylId: string,
  cpu: number,
  ram: number,
  disk: number,
  settings: PterodactylSettings
): Promise<void> {
  const isSimulated = pterodactylId.startsWith("sim_") || !settings.isConfigured || !settings.panelUrl || !settings.applicationApiKey;

  if (isSimulated) {
    console.log(`[PTERODACTYL SIMULATION] Updating server ${pterodactylId} limits to RAM: ${ram}MB, CPU: ${cpu}%, Disk: ${disk}MB`);
    return;
  }

  try {
    const baseUrl = settings.panelUrl.replace(/\/$/, "");
    
    // 1. Get the current allocation ID by querying the server details
    console.log(`[PTERODACTYL] Querying server details to locate default allocation for server ${pterodactylId}...`);
    const detailsUrl = `${baseUrl}/api/application/servers/${pterodactylId}`;
    const detailsResponse = await fetch(detailsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${settings.applicationApiKey}`,
        "Accept": "application/json"
      }
    });

    if (!detailsResponse.ok) {
      throw new Error(`Failed to fetch current server details (Status: ${detailsResponse.status})`);
    }

    const detailsJson = await detailsResponse.json();
    const allocationId = detailsJson?.attributes?.allocation;
    if (!allocationId) {
      throw new Error("Default allocation ID was not found in server details response");
    }

    // 2. Perform patching on the build limits
    console.log(`[PTERODACTYL] Patching resources for server ${pterodactylId}...`);
    const buildUrl = `${baseUrl}/api/application/servers/${pterodactylId}/build`;
    const patchResponse = await fetch(buildUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${settings.applicationApiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        allocation: allocationId,
        limits: {
          memory: ram,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu
        },
        feature_limits: {
          databases: 0,
          allocations: 1,
          backups: 0
        }
      })
    });

    if (!patchResponse.ok) {
      const errText = await patchResponse.text();
      throw new Error(`Failed to patch server build (Status: ${patchResponse.status}): ${errText}`);
    }

    console.log(`[PTERODACTYL] Server ${pterodactylId} resource patch successfully completed!`);
  } catch (err: any) {
    console.error(`[PTERODACTYL] Error patching server build details:`, err);
    throw new Error(err?.message || String(err));
  }
}
