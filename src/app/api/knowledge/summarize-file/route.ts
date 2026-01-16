import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// Use Claude API
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Check file type - be more lenient and check file extension
    const fileName = file.name.toLowerCase();
    const isTextFile = file.type === 'text/plain' || fileName.endsWith('.txt');
    const isCsvFile = file.type === 'text/csv' || fileName.endsWith('.csv');
    const isPdfFile = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isWordFile = 
      file.type === 'application/msword' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.doc') || 
      fileName.endsWith('.docx');
    const isExcelFile = 
      file.type === 'application/vnd.ms-excel' || 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xls') || 
      fileName.endsWith('.xlsx');

    // If no MIME type, try to read as text anyway (some browsers don't set MIME type)
    const canReadAsText = isTextFile || isCsvFile || (!file.type && (fileName.endsWith('.txt') || fileName.endsWith('.csv')));

    // Read file content
    let fileContent = '';
    
    if (canReadAsText) {
      try {
        fileContent = await file.text();
      } catch (error) {
        console.error('Error reading file as text:', error);
        return NextResponse.json(
          { error: 'Failed to read file content. Please ensure it is a valid text file.' },
          { status: 400 }
        );
      }
    } else if (isPdfFile) {
      return NextResponse.json(
        { error: 'PDF extraction requires additional setup. Please use text files (.txt) for now.' },
        { status: 400 }
      );
    } else if (isWordFile || isExcelFile) {
      return NextResponse.json(
        { error: 'Word/Excel extraction requires additional setup. Please use text files (.txt) for now.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { 
          error: `Unsupported file type. Please upload a text file (.txt or .csv). Received: ${file.type || 'unknown'} for file: ${file.name}`,
          receivedType: file.type || 'unknown',
          fileName: file.name
        },
        { status: 400 }
      );
    }

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'File is empty or could not be read' },
        { status: 400 }
      );
    }

    console.log('File content length:', fileContent.length);

    // Limit content size to avoid token limits
    const maxChars = 10000;
    if (fileContent.length > maxChars) {
      fileContent = fileContent.substring(0, maxChars) + '\n\n[Content truncated due to length...]';
    }

    // Call Claude API to analyze the content
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `You are an expert at analyzing operational documents and extracting key insights for a Knowledge Center system.

Your task is to analyze the provided document and extract:
1. **Challenges**: What problems, issues, or difficulties were encountered?
2. **Lessons Learned**: What insights, solutions, or best practices were discovered?
3. **Root Causes**: What were the underlying causes of the challenges?
4. **Recommendations**: What should be done in the future to prevent or address similar situations?

Document to analyze:
${fileContent}

Please format your response as a valid JSON object with these exact fields:
{
  "title": "A brief descriptive title (max 100 chars)",
  "summary": "A concise summary of the main points (2-3 sentences)",
  "challenges": "Description of challenges encountered",
  "lessonsLearned": "Key lessons learned from this experience",
  "rootCause": "Root causes identified (if any)",
  "recommendations": "Recommendations for future actions",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "severity": "Low|Medium|High|Critical",
  "process": "Design|Detailing|Procurement|Production|QC|Erection"
}

Be specific and extract actual information from the document. If certain fields cannot be determined, use null. Respond with ONLY the JSON object, no additional text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status} ${errorText}`);
    }

    const claudeResponse = await response.json();
    const content = claudeResponse.content[0]?.text || '{}';
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content);
      throw new Error('Failed to parse AI response');
    }

    return NextResponse.json({
      success: true,
      analysis,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Error summarizing file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to summarize file';
    console.error('Full error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}
