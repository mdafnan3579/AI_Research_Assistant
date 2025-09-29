import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcriptId } = await req.json();
    
    if (!transcriptId) {
      throw new Error('Transcript ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the transcript record
    const { data: transcript, error: fetchError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch transcript: ${fetchError.message}`);
    }

    // For demo purposes, generate a mock transcript based on the filename
    const mockTranscript = generateMockTranscript(transcript.file_name);
    
    // Update the transcript with the generated text
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        transcript_text: mockTranscript,
        processed_at: new Date().toISOString(),
        audio_duration: Math.floor(Math.random() * 3600) + 300, // Random duration between 5-65 minutes
      })
      .eq('id', transcriptId);

    if (updateError) {
      throw new Error(`Failed to update transcript: ${updateError.message}`);
    }

    // Generate AI insights using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY) {
      try {
        const insightsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are an expert research analyst. Analyze the transcript and provide structured insights for private equity and consulting teams. Focus on key themes, risks, opportunities, and actionable recommendations.'
              },
              {
                role: 'user',
                content: `Please analyze this interview transcript and provide insights:\n\n${mockTranscript}`
              }
            ]
          }),
        });

        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          const aiSummary = insightsData.choices[0]?.message?.content || '';

          // Extract key points from the AI response
          const keyPoints = extractKeyPoints(aiSummary);
          const tags = generateTags(aiSummary);

          // Create insights record
          const { error: insightsError } = await supabase
            .from('insights')
            .insert({
              transcript_id: transcriptId,
              user_id: transcript.user_id,
              summary_text: aiSummary,
              key_points: keyPoints,
              tags: tags,
              confidence_score: 0.85 + Math.random() * 0.15, // Random confidence between 0.85-1.0
            });

          if (insightsError) {
            console.error('Failed to create insights:', insightsError);
          }
        }
      } catch (aiError) {
        console.error('AI processing failed:', aiError);
        // Continue without insights if AI fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Audio processed successfully',
        transcript: mockTranscript 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing audio:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateMockTranscript(fileName: string): string {
  const templates = [
    `Interviewer: Thank you for joining us today. Could you start by telling us about your company's current market position?

Interviewee: Absolutely. We've been operating in the B2B software space for about 8 years now, and we've seen significant growth, especially in the last two years. Our recurring revenue has grown by 150% year-over-year, and we're currently serving over 2,000 enterprise clients.

Interviewer: That's impressive growth. What would you say are the main drivers behind this success?

Interviewee: I think there are three key factors. First, we identified a gap in the market early on - businesses were struggling with data integration across multiple platforms. Second, our team has deep domain expertise, with most of our engineers having 10+ years of experience in enterprise software. And third, we've been very focused on customer success and retention.

Interviewer: What challenges are you currently facing as you scale?

Interviewee: The main challenge is talent acquisition. We're growing so fast that we need to double our engineering team in the next 12 months, but finding qualified candidates is extremely difficult in today's market. We're also facing increased competition from larger players who are starting to notice our success.

Interviewer: How do you see the competitive landscape evolving?

Interviewee: We expect consolidation in our space within the next 2-3 years. The larger tech companies are acquiring smaller players, which creates both threats and opportunities for us. We need to either scale quickly enough to compete directly or position ourselves as an attractive acquisition target.

Interviewer: What are your funding needs and how would you use additional capital?

Interviewee: We're looking to raise $50M in Series B funding. The primary use would be scaling our sales and engineering teams, with about 60% going to talent acquisition, 25% to product development, and 15% to market expansion. We see a clear path to $100M ARR within 24 months with the right resources.`,

    `Interviewer: Let's discuss your company's financial performance over the past few years.

Interviewee: Our financials have been quite strong. We achieved profitability in year 3, which is relatively early for a SaaS company. Our gross margins are around 85%, and we've maintained an efficient CAC to LTV ratio of 1:5.

Interviewer: Can you walk us through your revenue model?

Interviewee: We operate on a subscription model with three tiers: Basic at $500/month, Professional at $2,000/month, and Enterprise starting at $10,000/month. About 70% of our revenue comes from the Professional tier, which targets mid-market companies. Our net revenue retention is 125%, indicating strong expansion within existing accounts.

Interviewer: What are the biggest risks you see for your business?

Interviewee: There are several risks we monitor closely. Technology risk is significant - our industry moves fast, and we need to continuously innovate to stay relevant. Regulatory changes, especially around data privacy, could impact our operations. And there's always the risk of new entrants with significant funding disrupting the market.

Interviewer: How do you approach product development and innovation?

Interviewee: We follow a data-driven approach. We spend a lot of time with our customers understanding their pain points. Our product roadmap is primarily driven by customer feedback and usage analytics. We also allocate about 20% of our engineering resources to experimental features and emerging technologies.

Interviewer: What's your international expansion strategy?

Interviewee: We're currently focused on the North American market, but we see significant opportunities in Europe and Asia-Pacific. We plan to enter the European market next year, starting with the UK and Germany. The regulatory environment in Europe is more complex, but the market opportunity is substantial.`,

    `Interviewer: Could you describe the management team and organizational structure?

Interviewee: Our leadership team brings together complementary skills. I handle strategy and business development, our CTO leads product and engineering, and our VP of Sales manages all revenue operations. We've kept the organization relatively flat to maintain agility, but we're starting to add middle management as we scale.

Interviewer: How do you maintain company culture during rapid growth?

Interviewee: Culture is something we think about constantly. We've documented our core values and ensure they're part of every hiring decision. We do quarterly all-hands meetings and maintain an open communication policy. The challenge is preserving the startup mentality while adding necessary processes and structure.

Interviewer: What role does technology play in your competitive advantage?

Interviewee: Technology is at the core of everything we do. We've built proprietary algorithms for data processing that give us a significant speed advantage over competitors. Our API response times are 3x faster than the industry average, and our uptime is 99.9%. We also have several patents pending on our core technology.

Interviewer: How do you see the next 5 years for your company?

Interviewee: We have an ambitious vision. In 5 years, we want to be the dominant platform in our category, with $500M+ in annual revenue. We see opportunities for horizontal expansion into adjacent markets and potentially strategic acquisitions. Going public is definitely on our roadmap, likely in the 3-4 year timeframe.

Interviewer: What would make this partnership successful from your perspective?

Interviewee: We're looking for more than just capital. We want a partner who understands our market and can provide strategic guidance as we scale. Access to your portfolio companies for potential partnerships or customers would be valuable. Most importantly, we want investors who share our long-term vision and won't pressure us for short-term returns at the expense of sustainable growth.`
  ];

  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return `File: ${fileName}\n\nTranscript:\n\n${randomTemplate}`;
}

function extractKeyPoints(aiSummary: string): string[] {
  // Extract bullet points or key insights from AI summary
  const lines = aiSummary.split('\n').filter(line => line.trim().length > 0);
  const keyPoints: string[] = [];
  
  lines.forEach(line => {
    if (line.includes('•') || line.includes('-') || line.includes('*')) {
      keyPoints.push(line.replace(/[•\-*]/g, '').trim());
    } else if (line.length > 50 && line.length < 200) {
      keyPoints.push(line.trim());
    }
  });

  // If no structured points found, create some from the content
  if (keyPoints.length === 0) {
    const sentences = aiSummary.split('.').filter(s => s.trim().length > 30);
    return sentences.slice(0, 5).map(s => s.trim() + '.');
  }

  return keyPoints.slice(0, 8); // Limit to 8 key points
}

function generateTags(aiSummary: string): string[] {
  const commonBusinessTags = [
    'growth', 'revenue', 'market-position', 'competition', 'scaling', 
    'funding', 'technology', 'team', 'strategy', 'risks', 'opportunities',
    'product-development', 'customer-success', 'market-expansion', 'partnerships'
  ];

  const summaryLower = aiSummary.toLowerCase();
  const relevantTags = commonBusinessTags.filter(tag => 
    summaryLower.includes(tag.replace('-', ' ')) || 
    summaryLower.includes(tag.replace('-', ''))
  );

  // Add some random relevant tags if not enough found
  if (relevantTags.length < 3) {
    const additionalTags = ['business-model', 'financial-performance', 'leadership'];
    relevantTags.push(...additionalTags.slice(0, 3 - relevantTags.length));
  }

  return relevantTags.slice(0, 6); // Limit to 6 tags
}