/**
 * Secret Santa — Draw Names Lambda Function
 *
 * Generates a valid circular shuffle: A→B→C→D→A (no self-assignments).
 * Uses service_key to bypass RLS and write assigned_to for all members.
 *
 * Input: { group_id, service_key }
 * Output: { success: true, pairs_count: N }
 *
 * Deploy with: POST /admin/v1/projects/:id/functions
 * Set secret: NONE required (service_key passed per-call)
 */

module.exports.handler = async (event) => {
  const { group_id, service_key } = JSON.parse(event.body || '{}');

  if (!group_id || !service_key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'group_id and service_key are required' })
    };
  }

  const API_URL = 'https://run402.com';
  const headers = {
    'Authorization': 'Bearer ' + service_key,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  try {
    // 1. Verify group exists and is open
    const groupRes = await fetch(
      `${API_URL}/rest/v1/groups?id=eq.${group_id}&select=id,status`,
      { headers }
    );
    const groups = await groupRes.json();
    if (!groups.length) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Group not found' }) };
    }
    if (groups[0].status === 'drawn') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Names already drawn' }) };
    }

    // 2. Fetch all members
    const membersRes = await fetch(
      `${API_URL}/rest/v1/members?group_id=eq.${group_id}&select=id,display_name&order=id`,
      { headers }
    );
    const members = await membersRes.json();

    if (members.length < 3) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Need at least 3 members to draw names' })
      };
    }

    // 3. Circular shuffle (Fisher-Yates then shift by 1)
    // Create a shuffled copy of member IDs
    const ids = members.map(m => m.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    // Assign: each person gives to the next in the shuffled order
    // Last person gives to first (circular)
    const assignments = {};
    for (let i = 0; i < ids.length; i++) {
      const giver = ids[i];
      const receiver = ids[(i + 1) % ids.length];
      assignments[giver] = receiver;
    }

    // 4. Write assignments to database
    for (const [giverId, receiverId] of Object.entries(assignments)) {
      const updateRes = await fetch(
        `${API_URL}/rest/v1/members?id=eq.${giverId}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ assigned_to: receiverId })
        }
      );
      if (!updateRes.ok) {
        throw new Error(`Failed to update member ${giverId}: ${await updateRes.text()}`);
      }
    }

    // 5. Update group status to 'drawn'
    await fetch(
      `${API_URL}/rest/v1/groups?id=eq.${group_id}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'drawn' })
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, pairs_count: members.length })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal error' })
    };
  }
};
