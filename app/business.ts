export const business = {
  phone: '071 603 4542',
  tel: 'tel:+27716034542',
  email: 'hello@landhomeproperties.co.za',
  address: '62 Piet Retief Street, Ficksburg, 9730',
  maps: 'https://www.google.com/maps/search/?api=1&query=62%20Piet%20Retief%20Street%2C%20Ficksburg%2C%209730',
};
export function whatsapp(message='Hello Land & Home Properties, I would like help with my next property move.') {
  return `https://wa.me/27716034542?text=${encodeURIComponent(message)}`;
}
// Only include visitor-entered enquiry fields, never browser history or tracking URLs.
export function enquiryMessage(fields:Record<string,string>) {
  const labels:Record<string,string>={enquiry_type:'Enquiry',property_reference:'Property reference',name:'Name',email:'Email',phone:'Phone',language:'Preferred language',town:'Town',type:'Property type',address:'Neighbourhood / address',beds:'Bedrooms',baths:'Bathrooms',budget:'Budget (R)',timeline:'Moving timeframe',timing:'Timeframe',finance:'Finance status',date:'Preferred viewing date',units:'Rental units',rent:'Monthly rent (R)',managed:'Currently managed',space:'Space (m²)',transaction:'Buy / lease',term:'Lease term',ownership:'Relationship to property',message:'Message',notes:'Notes'};
  return 'Hello Land & Home Properties,\n\n'+Object.entries(labels).filter(([key])=>fields[key]?.trim()).map(([key,label])=>`${label}: ${fields[key]}`).join('\n')+'\n\nPlease contact me about this enquiry.';
}
