require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const zones = [
  // NEW DELHI
  ['Paharganj Late Night Zone',     'High footfall area, harassment reported at night',   28.6448,  77.2167,  500, 'high',     'harassment'],
  ['Connaught Place Underpass',     'Poorly lit underpasses, avoid alone at night',       28.6315,  77.2167,  300, 'high',     'dark_area' ],
  ['Nizamuddin Railway Area',       'Crowded, pickpocketing and harassment reported',     28.5889,  77.2494,  400, 'medium',   'crime'     ],
  ['Kashmere Gate Bus Terminal',    'Isolated at night, chain snatching reported',        28.6671,  77.2282,  350, 'high',     'crime'     ],
  ['Sadar Bazaar Evening Zone',     'Crowded market, harassment at dusk and night',       28.6545,  77.2028,  400, 'medium',   'harassment'],
  ['Anand Vihar Terminal Area',     'Crime hotspot near bus/train terminal',              28.6464,  77.3159,  450, 'high',     'crime'     ],
  ['Yamuna Bank Isolated Stretch',  'Deserted river bank, avoid at all hours alone',     28.6200,  77.2850,  600, 'critical', 'dark_area' ],
  // MUMBAI
  ['Dharavi Isolated Lanes',        'Narrow unlit lanes, avoid alone after dark',         19.0397,  72.8527,  500, 'high',     'dark_area' ],
  ['Kurla Station Night Area',      'Snatch theft and harassment reported post 10pm',     19.0700,  72.8795,  400, 'high',     'crime'     ],
  ['Andheri East Industrial Zone',  'Isolated industrial area, poor street lighting',     19.1197,  72.8700,  500, 'medium',   'dark_area' ],
  ['Grant Road Area Late Night',    'High crime, harassment reported at night',           18.9637,  72.8146,  350, 'high',     'harassment'],
  ['Byculla Dark Stretch',          'Poorly lit road, accident and crime prone',          18.9756,  72.8331,  300, 'medium',   'accident'  ],
  ['Chembur Isolated Nullah Path',  'Unlit path along drainage, avoid at night',         19.0617,  72.9001,  400, 'high',     'dark_area' ],
  // BANGALORE
  ['Shivajinagar Bus Stand Night',  'Late night bus stand, harassment reported',          12.9850,  77.5983,  400, 'high',     'harassment'],
  ['Cubbon Park Night Stretch',     'Park is unsafe after dusk, avoid alone',             12.9763,  77.5929,  600, 'high',     'dark_area' ],
  ['KR Market Isolated Exit',       'Deserted after 9pm, snatch theft reported',          12.9625,  77.5762,  350, 'medium',   'crime'     ],
  ['Majestic Area Night Zone',      'High footfall, harassment and crime at night',       12.9767,  77.5713,  500, 'critical', 'crime'     ],
  ['Tin Factory Junction Night',    'Poorly lit junction, accident prone at night',       12.9901,  77.6603,  300, 'medium',   'accident'  ],
  // HYDERABAD
  ['Charminar Old City Night',      'Crowded old city, harassment reported at night',    17.3616,  78.4747,  500, 'high',     'harassment'],
  ['Secunderabad Station Area',     'Crime and harassment near station at night',         17.4399,  78.4983,  400, 'high',     'crime'     ],
  ['Moula Ali Industrial Belt',     'Isolated industrial zone, poor lighting',            17.4333,  78.5500,  500, 'medium',   'dark_area' ],
  ['Mehdipatnam Night Area',        'Snatch theft and harassment reported',               17.3936,  78.4333,  350, 'medium',   'crime'     ],
  // CHENNAI
  ['Koyambedu Market Night',        'Deserted at night, harassment reported',             13.0700,  80.1947,  400, 'high',     'harassment'],
  ['Central Railway Station Night', 'Crime and harassment near station after 11pm',      13.0827,  80.2707,  400, 'high',     'crime'     ],
  ['Perambur Industrial Area',      'Isolated roads, accident and crime prone',           13.1167,  80.2333,  450, 'medium',   'accident'  ],
  ['Kotturpuram Isolated Path',     'Unlit stretch near river, avoid alone at night',    13.0167,  80.2500,  350, 'high',     'dark_area' ],
  // KOLKATA
  ['Sealdah Station Night Zone',    'Crime hotspot near station after dark',              22.5651,  88.3698,  450, 'high',     'crime'     ],
  ['Park Street Night Stretch',     'Harassment and theft reported at night',             22.5503,  88.3527,  400, 'medium',   'harassment'],
  ['Ultadanga Isolated Area',       'Poorly lit roads, crime reported at night',          22.5800,  88.3933,  400, 'medium',   'dark_area' ],
  ['Howrah Station Surroundings',   'Crowded, pickpocketing and harassment risk',         22.5839,  88.3422,  500, 'high',     'crime'     ],
  // PUNE
  ['Pune Station Night Area',       'Crime near railway station after 10pm',              18.5284,  73.8743,  400, 'high',     'crime'     ],
  ['Shivajinagar Night Zone Pune',  'Harassment reported near bus stand at night',        18.5308,  73.8474,  350, 'medium',   'harassment'],
  ['Hadapsar Industrial Night',     'Isolated industrial area, poor lighting',            18.5022,  73.9347,  500, 'medium',   'dark_area' ],
  // AHMEDABAD
  ['Kalupur Area Night Zone',       'Crime and harassment near old city at night',        23.0300,  72.5900,  400, 'high',     'crime'     ],
  ['Naroda Industrial Belt',        'Isolated after dark, avoid alone',                   23.0900,  72.6400,  500, 'medium',   'dark_area' ],
  // JAIPUR
  ['Sindhi Camp Night Area',        'Harassment near bus terminal at night',              26.9215,  75.8002,  400, 'high',     'harassment'],
  ['Walled City Dark Lanes',        'Narrow unlit lanes in old city, avoid alone',       26.9239,  75.8267,  500, 'high',     'dark_area' ],
  // LUCKNOW
  ['Charbagh Station Night Zone',   'Crime near railway station at night',                26.8482,  80.9299,  400, 'high',     'crime'     ],
  ['Aminabad Night Area',           'Harassment in market area after dark',               26.8608,  80.9220,  350, 'medium',   'harassment'],
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🔗 Connected to database...');

    // Clear old global seed zones
    await client.query(`DELETE FROM danger_zones WHERE is_global = TRUE`);
    console.log('🗑️  Cleared old global zones.');

    let inserted = 0;
    for (const [name, description, lat, lng, radius, severity, category] of zones) {
      await client.query(
        `INSERT INTO danger_zones (name, description, latitude, longitude, radius_meters, severity, category, is_global, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,TRUE)`,
        [name, description, lat, lng, radius, severity, category]
      );
      inserted++;
    }

    const { rows } = await client.query(`SELECT COUNT(*) as total FROM danger_zones WHERE is_global = TRUE`);
    console.log(`✅ Seeded ${inserted} danger zones. Total global zones in DB: ${rows[0].total}`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
