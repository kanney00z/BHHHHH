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
    
    // Construct items array for Flex Message
    const itemsBoxArray: any[] = [];
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const optionTotal = (item.selectedOptions || []).reduce((sum: number, opt: any) => sum + (opt.price || 0), 0);
        const unitPrice = (item.menuItem?.price || 0) + optionTotal;

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
              "text": item.customName || item.menuItem?.name || 'Unknown',
              "size": "sm",
              "color": "#333333",
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
            "contents": [
              {
                "type": "text",
                "text": "📝 หมายเหตุ: " + item.note,
                "size": "xs",
                "color": "#e11d48", // red
                "wrap": true,
                "flex": 4,
                "offsetStart": "xl"
              }
            ]
          });
        }
      });
    }

    if (itemsBoxArray.length === 0) {
      itemsBoxArray.push({
         "type": "text", "text": "-", "size": "sm"
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
        "layout": "horizontal",
        "contents": [
          { "type": "text", "text": "คิวที่ (Queue)", "color": "#aaaaaa", "size": "sm" },
          { "type": "text", "text": String(order.queueNumber || '-'), "color": "#ff6b35", "size": "md", "align": "end", "weight": "bold" }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "margin": "md",
        "contents": [
          { "type": "text", "text": "ลูกค้า", "color": "#aaaaaa", "size": "sm" },
          { "type": "text", "text": order.customerName || 'ไม่ระบุ', "color": "#111111", "size": "sm", "align": "end", "weight": "bold", "wrap": true }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "margin": "md",
        "contents": [
          { "type": "text", "text": "เบอร์โทร", "color": "#aaaaaa", "size": "sm", "flex": 1 },
          { "type": "text", "text": order.customerPhone || 'ไม่ระบุ', "color": "#111111", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "margin": "md",
        "contents": [
          { "type": "text", "text": "ที่อยู่", "color": "#aaaaaa", "size": "sm", "flex": 1 },
          { "type": "text", "text": addressStr || '-', "color": "#3b82f6", "size": "xs", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "margin": "md",
        "contents": [
          { "type": "text", "text": "ประเภท", "color": "#aaaaaa", "size": "sm", "flex": 1 },
          { "type": "text", "text": orderTypeStr + timeStr, "color": "#2563eb", "size": "sm", "align": "end", "weight": "bold", "wrap": true, "flex": 3 }
        ]
      },
      {
        "type": "box",
        "layout": "horizontal",
        "margin": "md",
        "contents": [
          { "type": "text", "text": "ชำระเงิน", "color": "#aaaaaa", "size": "sm" },
          { "type": "text", "text": order.paymentMethod === 'promptpay' ? 'พร้อมเพย์' : 'เงินสด', "color": order.paymentMethod === 'promptpay' ? "#10b981" : "#f59e0b", "size": "sm", "align": "end", "weight": "bold" }
        ]
      },
      { "type": "separator", "margin": "xxl" },
      {
        "type": "box",
        "layout": "vertical",
        "margin": "xxl",
        "spacing": "md",
        "contents": itemsBoxArray
      },
      { "type": "separator", "margin": "xxl" },
      ...(order.delivery_fee && order.delivery_fee > 0 ? [
        {
          "type": "box" as const,
          "layout": "horizontal" as const,
          "margin": "xxl" as const,
          "contents": [
            { "type": "text" as const, "text": "ค่าสินค้า", "size": "sm" as const, "color": "#aaaaaa" as const },
            { "type": "text" as const, "text": "฿" + (order.total - order.delivery_fee), "size": "sm" as const, "color": "#555555" as const, "align": "end" as const }
          ]
        },
        {
          "type": "box" as const,
          "layout": "horizontal" as const,
          "margin": "md" as const,
          "contents": [
            { "type": "text" as const, "text": "ค่าจัดส่ง", "size": "sm" as const, "color": "#aaaaaa" as const },
            { "type": "text" as const, "text": "฿" + order.delivery_fee, "size": "sm" as const, "color": "#555555" as const, "align": "end" as const }
          ]
        }
      ] : []),
      {
        "type": "box",
        "layout": "horizontal",
        "margin": order.delivery_fee && order.delivery_fee > 0 ? "md" : "xxl",
        "contents": [
          { "type": "text", "text": "ยอดรวมสุทธิ", "size": "md", "color": "#555555", "weight": "bold" },
          { "type": "text", "text": "฿" + order.total, "size": "lg", "color": "#ff6b35", "align": "end", "weight": "bold" }
        ]
      }
    ];

    // Embed slip image directly inside the receipt if found
    if (order.paymentSlipUrl) {
      bodyContents.push({ "type": "separator", "margin": "xxl" });
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

    // JSON Flex Layout Design
    const flexBubble = {
      "type": "bubble",
      "size": "mega",
      "header": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "20px",
        "backgroundColor": "#ff6b35",
        "contents": [
          {
            "type": "text",
            "text": "YUMDASH RECEIPT",
            "color": "#ffffff80",
            "weight": "bold",
            "size": "xs"
          },
          {
            "type": "text",
            "text": "🛎️ ออเดอร์ใหม่!",
            "color": "#ffffff",
            "weight": "bold",
            "size": "xxl",
            "margin": "md"
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
        "paddingAll": "20px",
        "spacing": "sm",
        "contents": [
          ...(mapUrl ? [{
            "type": "button",
            "style": "secondary",
            "color": "#e0e7ff",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "📍 แผนที่จัดส่ง (ลูกค้า)",
              "uri": mapUrl
            }
          }] : []),
          {
            "type": "button",
            "style": "primary",
            "color": "#111111",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "📝 เปิดหลังบ้านแอดมิน",
              "uri": "http://localhost:5173/admin/orders"
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
