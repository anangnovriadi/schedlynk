import { generateICSCalendar } from './icsCalendar';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

interface EmailNotificationOptions {
  booking: any;
  service: any;
  assignedUser: any;
  team: any;
  baseUrl: string;
}

/**
 * Generate booking confirmation email with professional design
 */
export function generateBookingConfirmationEmail(options: EmailNotificationOptions): EmailTemplate {
  const { booking, service, assignedUser, team, baseUrl } = options;
  
  const startDate = new Date(booking.start);
  const endDate = new Date(booking.end);
  
  const rescheduleUrl = `${baseUrl}/booking/${booking.manageToken}/reschedule`;
  const cancelUrl = `${baseUrl}/booking/${booking.manageToken}/cancel`;
  const manageUrl = `${baseUrl}/booking/${booking.manageToken}`;
  
  // Generate ICS calendar file
  const icsContent = generateICSCalendar({
    booking,
    service,
    assignedUser,
    team,
    rescheduleUrl,
    cancelUrl
  });
  
  const subject = `Appointment Confirmed: ${service.name} - ${startDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmation</title>
      <style>
        body { 
          font-family: system-ui, sans-serif;
          line-height: 1.5; 
          color: #374151; 
          background-color: #f9fafb; 
          margin: 0;
          padding: 20px;
        }
        .container { 
          max-width: 500px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 8px; 
          border: 1px solid #e5e7eb;
        }
        .header { 
          background: #111827; 
          color: white; 
          padding: 24px; 
          text-align: center;
        }
        .header h1 { 
          font-size: 20px; 
          margin: 0; 
        }
        .content { 
          padding: 24px; 
        }
        .detail { 
          margin-bottom: 12px; 
        }
        .detail strong { 
          color: #111827;
        }
        .button { 
          display: inline-block; 
          background: #111827; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 8px 8px 8px 0;
        }
        .button-cancel { 
          background: #ef4444; 
        }
        .footer { 
          padding: 24px; 
          border-top: 1px solid #e5e7eb; 
          font-size: 14px; 
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Confirmed</h1>
        </div>
        
        <div class="content">
          <h2>Appointment Details</h2>
          
          <div class="detail">
            <strong>Service:</strong> ${service.name}
          </div>
          
          <div class="detail">
            <strong>Date:</strong> ${startDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          
          <div class="detail">
            <strong>Time:</strong> ${startDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })} - ${endDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          
          <div class="detail">
            <strong>Provider:</strong> ${assignedUser.name}
          </div>
          
          <div class="detail">
            <strong>Duration:</strong> ${service.duration} minutes
          </div>

          <h3>Manage Your Appointment</h3>
          
          <a href="${manageUrl}" class="button">View Details</a>
          <a href="${rescheduleUrl}" class="button">Reschedule</a>
          <a href="${cancelUrl}" class="button button-cancel">Cancel</a>
        </div>
        
        <div class="footer">
          <p>Booked with ${team.name}</p>
          <p>Questions? Contact ${assignedUser.name} at ${assignedUser.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
APPOINTMENT CONFIRMED ✅

Your booking has been successfully scheduled.

APPOINTMENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service: ${service.name}
Team: ${team.name}
Provider: ${assignedUser.name || assignedUser.email}
Date: ${startDate.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
Time: ${startDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})} - ${endDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}
Duration: ${service.duration} minutes
${booking.guestName ? `Guest: ${booking.guestName}` : ''}
Status: CONFIRMED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANAGE YOUR APPOINTMENT:
• View Details: ${manageUrl}
• Reschedule: ${rescheduleUrl}
• Cancel: ${cancelUrl}

IMPORTANT REMINDERS:
• Please arrive 5 minutes early for your appointment
• Bring any required documents or materials
• Contact us if you need to make any changes in advance
• Add this event to your calendar using the attached .ics file
• Save this email for your records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This email was sent by ${team.name}
Powered by Scheduler Lite • Professional Appointment Management
  `;
  
  return {
    subject,
    html,
    text,
    attachments: [{
      filename: `${service.name.replace(/\s+/g, '_')}_${startDate.toISOString().split('T')[0]}.ics`,
      content: Buffer.from(icsContent).toString('base64'),
      type: 'text/calendar'
    }]
  };
}

/**
 * Generate booking cancellation email
 */
export function generateBookingCancellationEmail(options: EmailNotificationOptions): EmailTemplate {
  const { booking, service, assignedUser, team, baseUrl } = options;
  
  const startDate = new Date(booking.start);
  const endDate = new Date(booking.end);
  const manageUrl = `${baseUrl}/booking/${booking.manageToken}`;
  
  const subject = `Appointment Cancelled: ${service.name} - ${startDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Cancelled</title>
      <style>
        body { 
          font-family: system-ui, sans-serif;
          line-height: 1.5; 
          color: #374151; 
          background-color: #f9fafb; 
          margin: 0;
          padding: 20px;
        }
        .container { 
          max-width: 500px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 8px; 
          border: 1px solid #e5e7eb;
        }
        .header { 
          background: #ef4444; 
          color: white; 
          padding: 24px; 
          text-align: center;
        }
        .header h1 { 
          font-size: 20px; 
          margin: 0; 
        }
        .content { 
          padding: 24px; 
        }
        .detail { 
          margin-bottom: 12px; 
        }
        .detail strong { 
          color: #111827;
        }
        .footer { 
          padding: 24px; 
          border-top: 1px solid #e5e7eb; 
          font-size: 14px; 
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Cancelled</h1>
        </div>
        
        <div class="content">
          <p>Your appointment has been cancelled.</p>
          
          <h2>Cancelled Appointment Details</h2>
          
          <div class="detail">
            <strong>Service:</strong> ${service.name}
          </div>
          
          <div class="detail">
            <strong>Date:</strong> ${startDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          
          <div class="detail">
            <strong>Time:</strong> ${startDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })} - ${endDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          
          <div class="detail">
            <strong>Provider:</strong> ${assignedUser.name || assignedUser.email}
          </div>
          
          <p>If you need to schedule a new appointment, please contact us directly.</p>
        </div>
        
        <div class="footer">
          <p>Cancelled by ${team.name}</p>
          <p>Questions? Contact ${assignedUser.name} at ${assignedUser.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
APPOINTMENT CANCELLED

Your booking has been cancelled.

CANCELLED APPOINTMENT DETAILS:
Service: ${service.name}
Date: ${startDate.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
Time: ${startDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})} - ${endDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}
Provider: ${assignedUser.name || assignedUser.email}

If you need to schedule a new appointment, please contact us directly.

This email was sent by ${team.name}
Powered by Scheduler Lite
  `;
  
  return {
    subject,
    html,
    text
  };
}

/**
 * Generate booking reschedule email
 */
export function generateBookingRescheduleEmail(options: EmailNotificationOptions): EmailTemplate {
  const { booking, service, assignedUser, team, baseUrl } = options;
  
  const startDate = new Date(booking.start);
  const endDate = new Date(booking.end);
  const manageUrl = `${baseUrl}/booking/${booking.manageToken}`;
  
  const subject = `Appointment Rescheduled: ${service.name} - ${startDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Rescheduled</title>
      <style>
        body { 
          font-family: system-ui, sans-serif;
          line-height: 1.5; 
          color: #374151; 
          background-color: #f9fafb; 
          margin: 0;
          padding: 20px;
        }
        .container { 
          max-width: 500px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 8px; 
          border: 1px solid #e5e7eb;
        }
        .header { 
          background: #f59e0b; 
          color: white; 
          padding: 24px; 
          text-align: center;
        }
        .header h1 { 
          font-size: 20px; 
          margin: 0; 
        }
        .content { 
          padding: 24px; 
        }
        .detail { 
          margin-bottom: 12px; 
        }
        .detail strong { 
          color: #111827;
        }
        .footer { 
          padding: 24px; 
          border-top: 1px solid #e5e7eb; 
          font-size: 14px; 
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Rescheduled</h1>
        </div>
        
        <div class="content">
          <p>Your appointment has been rescheduled.</p>
          
          <h2>Updated Appointment Details</h2>
          
          <div class="detail">
            <strong>Service:</strong> ${service.name}
          </div>
          
          <div class="detail">
            <strong>New Date:</strong> ${startDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          
          <div class="detail">
            <strong>New Time:</strong> ${startDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })} - ${endDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          
          <div class="detail">
            <strong>Provider:</strong> ${assignedUser.name || assignedUser.email}
          </div>
          
          <p>Please update your calendar accordingly.</p>
        </div>
        
        <div class="footer">
          <p>Rescheduled by ${team.name}</p>
          <p>Questions? Contact ${assignedUser.name} at ${assignedUser.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
APPOINTMENT RESCHEDULED

Your booking has been updated.

UPDATED APPOINTMENT DETAILS:
Service: ${service.name}
New Date: ${startDate.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
New Time: ${startDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})} - ${endDate.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit', 
  hour12: true 
})}
Provider: ${assignedUser.name || assignedUser.email}

Your appointment has been successfully rescheduled. Please update your calendar accordingly.

This email was sent by ${team.name}
Powered by Scheduler Lite
  `;
  
  return {
    subject,
    html,
    text
  };
}