const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function check() {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (p:Post) RETURN p.images, p.video, p.content ORDER BY p.createdAt DESC LIMIT 5'
    );
    console.log('--- LATEST 5 POSTS ---');
    result.records.forEach((record, i) => {
      console.log(`\nPost ${i + 1}:`);
      console.log('Content:', record.get('p.content'));
      console.log('Images:', record.get('p.images'));
      console.log('Video:', record.get('p.video'));
    });
  } catch (error) {
    console.error('DB Error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

check();
