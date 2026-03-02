// Test script to check Edge Function deployment
// Run this to debug the daily-insights function

const testEdgeFunction = async () => {
  try {
    console.log('Testing Edge Function deployment...')
    
    // Test basic connection
    const response = await fetch('/api/v1/functions/daily-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.token') || ''}`
      },
      body: JSON.stringify({
        dailyData: {
          diet: { total_calories: 1500 },
          exercise: { total_minutes: 20 },
          sleep: { duration_hours: 7 },
          water: { glasses: 6 },
          stress: { stress_level: 3 }
        },
        userProfile: { name: 'Test User' },
        userId: 'test-user-id'
      })
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const result = await response.text()
    console.log('Response body:', result)
    
    try {
      const jsonResult = JSON.parse(result)
      console.log('Parsed JSON:', jsonResult)
    } catch (e) {
      console.error('Failed to parse JSON:', e)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Export for manual testing
window.testEdgeFunction = testEdgeFunction
console.log('Edge Function test loaded. Run testEdgeFunction() to test.')
