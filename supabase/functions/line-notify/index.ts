import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LINE_CHANNEL_ACCESS_TOKEN = "XSOp1dJdNKEw9HGD7fRlN4VJX5fWYmS/EYXqWMMq5pHMtWXOizNLp5FEaNyDbmoalfFkqPBxbn/y9cEWse3hl5OEyUUkKZf9Ej/y2DO5+WLhuLDuIvlkx4LT+imCU+Ptl9kklN7nG1FRzPDemE73tgdB04t89/1O/w1cDnyilFU=";

// @ts-ignore: Deno is the global runtime of Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const order = await req.json();
    
    // Check if order contains a custom item
    const hasCustomItem = order.items && Array.isArray(order.items) && 
      order.items.some((i: any) => (i.customName || i.menuItem?.name || '').includes('เมนูสั่งตามใจ') || i.isCustomItem);
    
    const isAwaitingPayment = order.status === 'awaiting_payment';
    
    // Construct items array for Flex Message
    const itemsBoxArray: any[] = [];
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const optionTotal = (item.selectedOptions || []).reduce((sum: number, opt: any) => sum + (opt.price || 0), 0);
        const unitPrice = (item.menuItem?.price || 0) + optionTotal;
        const itemName = item.customName || item.menuItem?.name || 'Unknown';
        const isThisItemCustom = itemName.includes('เมนูสั่งตามใจ') || item.isCustomItem;

        itemsBoxArray.push({
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": String(item.quantity) + "x",
              "size": "sm",
              "color": "#ff6b35",
              "weight": "bold",
              "flex": 1
            },
            {
              "type": "text",
              "text": isThisItemCustom ? `✨ ${itemName}` : itemName,
              "size": "sm",
              "color": isThisItemCustom ? "#9333ea" : "#333333",
              "weight": isThisItemCustom ? "bold" : "regular",
              "wrap": true,
              "flex": 4
            },
            {
              "type": "text",
              "text": "฿" + (unitPrice * item.quantity),
              "size": "sm",
              "color": "#111111",
              "align": "end",
              "flex": 2
            }
          ]
        });

        if (item.selectedOptions && item.selectedOptions.length > 0) {
          item.selectedOptions.forEach((opt: any) => {
            itemsBoxArray.push({
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "text",
                  "text": "  - " + opt.choiceName + (opt.price > 0 ? ` (+฿${opt.price})` : ''),
                  "size": "xs",
                  "color": "#888888",
                  "wrap": true,
                  "flex": 4,
                  "offsetStart": "xl"
                }
              ]
            });
          });
        }
        
        // Add note conditionally
        if (item.note) {
          itemsBoxArray.push({
            "type": "box",
            "layout": "horizontal",
            "paddingBottom": "4px",
            "contents": [
              {
                "type": "text",
                "text": "📝 " + item.note,
                "size": "xs",
                "color": "#ef4444",
                "wrap": true,
                "flex": 4,
                "offsetStart": "xl",
                "style": "italic"
              }
            ]
          });
        }
      });
    }

    if (itemsBoxArray.length === 0) {
      itemsBoxArray.push({
         "type": "text", "text": "ไม่มีรายการอาหาร", "size": "sm", "color": "#888888"
      });
    }

    // Order Type Logic
    const orderTypeLabel: Record<string, string> = {
      delivery: '🛵 จัดส่ง',
      dine_in: '🍽️ ทานที่ร้าน',
      takeaway: '🛍️ กลับบ้าน'
    };
    
    // Default to delivery if undefined, as existing orders might not have it
    const orderTypeStr = orderTypeLabel[order.orderType || 'delivery'] || orderTypeLabel['delivery'];
    const timeStr = (order.orderType && order.orderType !== 'delivery' && order.pickupTime) ? ` เวลา ${order.pickupTime}` : '';

    const addressStr = order.customerAddress || '';
    const mapUrlMatch = addressStr.match(/https:\/\/maps\.google\.com\/\?q=[^\s\n]+/);
    const mapUrl = mapUrlMatch ? mapUrlMatch[0] : null;

    // Base body contents
    const bodyContents: any[] = [
      {
        "type": "box",
        "layout": "vertical",
        "margin": "md",
        "spacing": "sm",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "คิวที่ (Queue)", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": String(order.queueNumber || '-'), "color": "#FF2D55", "size": "md", "align": "end", "weight": "bold", "flex": 3 }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "ลูกค้า", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": order.customerName || 'ไม่ระบุ', "color": "#111111", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "เบอร์โทร", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": order.customerPhone || 'ไม่ระบุ', "color": "#111111", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "ประเภท", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": orderTypeStr + timeStr, "color": "#2563eb", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "ชำระเงิน", "color": "#888888", "size": "sm", "flex": 2 },
              { "type": "text", "text": order.paymentMethod === 'promptpay' ? '✅ โอนเงิน (พร้อมเพย์)' : '💵 เงินสด', "color": order.paymentMethod === 'promptpay' ? "#10b981" : "#f59e0b", "size": "sm", "align": "end", "weight": "bold", "flex": 3 }
            ]
          }
        ]
      },
      { "type": "separator", "margin": "lg", "color": "#E5E5E5" },
      {
        "type": "box",
        "layout": "vertical",
        "margin": "lg",
        "spacing": "sm",
        "contents": itemsBoxArray
      },
      { "type": "separator", "margin": "lg", "color": "#E5E5E5" },
      ...(order.delivery_fee && order.delivery_fee > 0 ? [
        {
          "type": "box" as const,
          "layout": "horizontal" as const,
          "margin": "lg" as const,
          "contents": [
            { "type": "text" as const, "text": "ค่าอาหาร", "size": "sm" as const, "color": "#888888" as const },
            { "type": "text" as const, "text": "฿" + (order.total - order.delivery_fee), "size": "sm" as const, "color": "#111111" as const, "align": "end" as const }
          ]
        },
        {
          "type": "box" as const,
          "layout": "horizontal" as const,
          "margin": "sm" as const,
          "contents": [
            { "type": "text" as const, "text": "ค่าจัดส่ง", "size": "sm" as const, "color": "#888888" as const },
            { "type": "text" as const, "text": "฿" + order.delivery_fee, "size": "sm" as const, "color": "#111111" as const, "align": "end" as const }
          ]
        }
      ] : []),
      {
        "type": "box",
        "layout": "horizontal",
        "margin": "md",
        "contents": [
          { "type": "text", "text": "ยอดรวมสุทธิ", "size": "md", "color": "#111111", "weight": "bold" },
          { "type": "text", "text": "฿" + order.total, "size": "xl", "color": "#FF2D55", "align": "end", "weight": "bold" }
        ]
      }
    ];

    // Address section if exists (put at the very bottom before slip)
    if (addressStr) {
      bodyContents.splice(bodyContents.length - 1, 0, 
        { "type": "separator", "margin": "lg", "color": "#E5E5E5" },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "md",
          "contents": [
            { "type": "text", "text": "📍 ที่อยู่จัดส่ง", "color": "#888888", "size": "xs", "weight": "bold", "margin": "sm" },
            { "type": "text", "text": addressStr, "color": "#4b5563", "size": "sm", "wrap": true, "margin": "sm" }
          ]
        }
      );
    }

    // Embed slip image directly inside the receipt if found
    if (order.paymentSlipUrl) {
      bodyContents.push({ "type": "separator", "margin": "lg", "color": "#E5E5E5" });
      bodyContents.push({
        "type": "box",
        "layout": "vertical",
        "margin": "xxl",
        "contents": [
          { "type": "text", "text": "หลักฐานการโอนเงิน", "size": "xs", "color": "#aaaaaa", "align": "center", "margin": "sm" },
          {
            "type": "image",
            "url": order.paymentSlipUrl,
            "size": "full",
            "aspectMode": "fit",
            "aspectRatio": "3:4",
            "margin": "md"
          }
        ]
      });
    }

    // Header dynamic color & Text based on status
    let headerColor = "#FF2D55"; // Default Apple Pink
    let headerTitle = "🚨 มีออเดอร์ใหม่เข้า!";
    
    if (hasCustomItem) {
      if (isAwaitingPayment) {
        headerColor = "#10b981"; // Emerald Green for evaluated (success)
        headerTitle = "💸 ประเมินราคาเสร็จ (สแกนจ่ายได้เลย)";
      } else {
        headerColor = "#9333ea"; // Purple for pending evaluation
        headerTitle = "✨ ออเดอร์สั่งตามใจ (รอประเมินราคา)";
      }
    }

    // JSON Flex Layout Design
    const flexBubble = {
      "type": "bubble",
      "size": "mega",
      "header": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "xl",
        "backgroundColor": headerColor,
        "contents": [
          {
            "type": "text",
            "text": "YEN TA FO BY P'OH",
            "color": "#ffffff80",
            "weight": "bold",
            "size": "xs"
          },
          {
            "type": "text",
            "text": headerTitle,
            "color": "#ffffff",
            "weight": "bold",
            "size": "lg",
            "margin": "md",
            "wrap": true
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "20px",
        "contents": bodyContents
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "lg",
        "spacing": "sm",
        "backgroundColor": "#FAFAFA",
        "contents": [
          ...(mapUrl ? [{
            "type": "button",
            "style": "secondary",
            "color": "#E5E5E5",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "📍 นำทาง (Google Maps)",
              "uri": mapUrl
            }
          }] : []),
          {
            "type": "button",
            "style": "primary",
            "color": "#FF2D55",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "📝 เปิดหลังบ้านแอดมิน",
              "uri": "https://yentafoo.vercel.app/admin" // Updated to generic production URL for safety
            }
          }
        ]
      }
    };

    const messages: any[] = [
      {
        type: "flex",
        altText: `🛎️ มีออเดอร์ใหม่! ลูกค้า: ${order.customerName || 'ไม่ระบุ'} ประเภท: ${orderTypeStr} ยอด: ฿${order.total || 0}`,
        contents: flexBubble
      }
    ];

    const payload = { messages };

    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE Messaging API failed:', errorText);
      return new Response(JSON.stringify({ error: errorText }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.stack || err.message }), { 
      status: 500, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      } 
    });
  }
});
