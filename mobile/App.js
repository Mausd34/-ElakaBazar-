import React, {useEffect, useState} from 'react';
import {SafeAreaView, View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator} from 'react-native';
import axios from 'axios';
const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api/v1';
export default function App(){
 const [products,setProducts]=useState([]); const [loading,setLoading]=useState(true); const [search,setSearch]=useState('');
 useEffect(()=>{axios.get(`${API}/products/`).then(r=>setProducts(r.data.results||r.data)).catch(()=>{}).finally(()=>setLoading(false));},[]);
 const shown=products.filter(p=>(p.product_name+' '+p.product_name_bn).toLowerCase().includes(search.toLowerCase()));
 return <SafeAreaView style={s.page}><Text style={s.brand}>🛒 ElakaBazar</Text><Text style={s.tag}>আপনার এলাকার বাজার, এখন আপনার হাতেই।</Text><TextInput style={s.search} placeholder="পণ্য খুঁজুন..." value={search} onChangeText={setSearch}/>{loading?<ActivityIndicator color="#16834a"/>:<FlatList data={shown} keyExtractor={x=>String(x.id)} renderItem={({item})=><View style={s.card}><View style={{flex:1}}><Text style={s.name}>{item.product_name_bn||item.product_name}</Text><Text style={s.meta}>{item.shop_name} · {item.unit}</Text></View><Text style={s.price}>৳{item.price}</Text></View>} ListEmptyComponent={<Text style={s.meta}>কোনো পণ্য পাওয়া যায়নি। API সংযোগ পরীক্ষা করুন।</Text>}/>}</SafeAreaView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f8faf7',padding:18},brand:{fontSize:26,fontWeight:'800',color:'#16834a',marginTop:15},tag:{color:'#66786b',marginTop:4,marginBottom:18},search:{backgroundColor:'white',borderWidth:1,borderColor:'#e2e9e1',padding:13,borderRadius:10,marginBottom:15},card:{backgroundColor:'white',padding:16,borderRadius:12,marginBottom:10,flexDirection:'row',alignItems:'center'},name:{fontWeight:'700',fontSize:16,color:'#20392a'},meta:{fontSize:12,color:'#829087',marginTop:5},price:{fontSize:16,fontWeight:'800',color:'#16834a'}});
