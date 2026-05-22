export const generateMonthlyEmailHTML = (
  childName,
  month,
  year,
  summary,
  highlights,
  memoryCount,
  emailOptions = {}
) => {
  const { isRefreshed = false } = emailOptions;
  const refreshedBanner = isRefreshed
    ? `
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div style="background-color: #ecfdf5; border: 1px solid #87C38F; border-radius: 12px; padding: 16px 20px;">
                  <p style="color: #166534; margin: 0; font-size: 15px; line-height: 1.5;">
                    <strong>Refreshed summary.</strong> This summary was refreshed because new memories were added to this month.
                  </p>
                </div>
              </td>
            </tr>`
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${childName}'s ${month} ${year} Memories</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f4ff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4ff; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #E07A5F 0%, #C85A3F 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">📖 MemoryLane</h1>
                <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">${childName}'s ${month} ${year} Summary</p>
              </td>
            </tr>
            
            <!-- Stats -->
            <tr>
              <td style="padding: 30px; background-color: #faf5ff;">
                <table width="100%" cellpadding="10">
                  <tr>
                    <td align="center" style="padding: 15px;">
                      <div style="background-color: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-size: 36px; font-weight: bold; color: #E07A5F;">${memoryCount}</div>
                        <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Memories Captured</div>
                      </div>
                    </td>
                    <td align="center" style="padding: 15px;">
                      <div style="background-color: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-size: 36px;">🎉</div>
                        <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">${highlights.milestones} Milestones</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${refreshedBanner}
            <!-- AI Summary -->
            <tr>
              <td style="padding: 30px;">
                <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">✨ This Month's Story</h2>
                <div style="background-color: #f9fafb; border-left: 4px solid #E07A5F; padding: 20px; border-radius: 8px;">
                  <p style="color: #374151; line-height: 1.8; margin: 0; font-size: 16px;">${summary}</p>
                </div>
              </td>
            </tr>
            
            <!-- Highlights -->
            <tr>
              <td style="padding: 0 30px 30px 30px;">
                <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">🌟 Highlights</h2>
                ${highlights.memories.map(m => `
                  <div style="background-color: #faf5ff; padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e9d5ff;">
                    ${m.milestone ? `<div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 10px;">${m.milestone}</div>` : ''}
                    <div style="color: #1f2937; font-weight: bold; font-size: 18px; margin-bottom: 8px;">${m.title}</div>
                    <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">${m.content}</div>
                    <div style="color: #E07A5F; font-size: 12px; margin-top: 8px;">${m.date}</div>
                  </div>
                `).join('')}
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 30px; background-color: #faf5ff; text-align: center; border-top: 1px solid #e9d5ff;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                  Keep capturing precious moments with MemoryLane
                </p>
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                  You're receiving this because you're subscribed to monthly summaries
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
    `;
  };